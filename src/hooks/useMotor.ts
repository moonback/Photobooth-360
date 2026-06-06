/**
 * useMotor — WebSerial + WebUSB motor control hook
 *
 * Supports two backends:
 *   - WebSerial  : serial port (USB-to-serial, CH340, CP2102, FTDI…)
 *   - WebUSB     : direct USB (custom HID-style bulk-transfer device)
 *
 * Protocol (simple ASCII over serial / bulk-out):
 *   MOTOR:SPEED:<0-100>         → set speed (% of max)
 *   MOTOR:DIR:<CW|CCW>          → set direction
 *   MOTOR:TURNS:<n>             → set number of revolutions (0 = continuous)
 *   MOTOR:START                 → start rotation
 *   MOTOR:STOP                  → stop immediately
 *   MOTOR:RESET                 → return to home position
 *   MOTOR:STATUS                → request status (device replies with JSON)
 *
 * Sync responses expected from firmware:
 *   READY                       → plateau has reached target speed (preferred)
 *   RUNNING                     → motor started (fallback)
 *   {"running":true}            → JSON status variant
 *   STOPPED / {"running":false} → motor stopped
 *
 * All commands are newline-terminated (\n).
 */

import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MotorDirection = "CW" | "CCW";
export type MotorBackend = "serial" | "usb";
export type MotorConnectionState = "disconnected" | "connecting" | "connected" | "error";

export interface MotorConfig {
  /** Speed 0–100 % */
  speed: number;
  direction: MotorDirection;
  /** Number of full turns. 0 = continuous until STOP */
  turns: number;
  /** Baud rate for WebSerial (default 115200) */
  baudRate: number;
  /** Preferred backend */
  backend: MotorBackend;
}

export interface UseMotorReturn {
  /** Whether WebSerial or WebUSB is available in this browser */
  isSupported: boolean;
  connectionState: MotorConnectionState;
  error: string | null;
  isRunning: boolean;
  lastStatus: string | null;
  /** Open connection dialog and connect */
  connect: (backend?: MotorBackend) => Promise<void>;
  /** Close active connection */
  disconnect: () => Promise<void>;
  /** Apply speed + direction + turns, then start */
  startMotor: (config: MotorConfig) => Promise<void>;
  /**
   * Start motor and wait until the firmware confirms it is up to speed.
   * Resolves when READY/RUNNING is received, or after `timeoutMs` (fallback).
   * Use this for recording sync — only start recording after this resolves.
   */
  startMotorAndWaitReady: (config: MotorConfig, timeoutMs?: number) => Promise<void>;
  /** Send STOP command */
  stopMotor: () => Promise<void>;
  /** Send RESET command */
  resetMotor: () => Promise<void>;
  /** Send a raw ASCII command (newline appended automatically) */
  sendCommand: (cmd: string) => Promise<void>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function encodeCmd(cmd: string): Uint8Array {
  return encoder.encode(cmd + "\n");
}

// Lines that indicate the motor has reached running speed
const READY_TOKENS = ["READY", "RUNNING", '"running":true'];

// ESP32 boot confirmation
const BOOT_TOKEN = "PHOTOBOOTH360_READY";

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMotor(): UseMotorReturn {
  const isSupported =
    typeof navigator !== "undefined" &&
    ("serial" in navigator || "usb" in navigator);

  const [connectionState, setConnectionState] = useState<MotorConnectionState>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [lastStatus, setLastStatus] = useState<string | null>(null);

  // WebSerial refs
  const serialPortRef = useRef<SerialPort | null>(null);
  const serialWriterRef = useRef<WritableStreamDefaultWriter<Uint8Array> | null>(null);
  const serialReaderRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const readerLoopRef = useRef<boolean>(false);

  // WebUSB refs
  const usbDeviceRef = useRef<USBDevice | null>(null);
  const usbEndpointOutRef = useRef<number>(1);
  const usbEndpointInRef = useRef<number>(1);

  const activeBackendRef = useRef<MotorBackend | null>(null);

  // Pending ready-waiters: each entry is a resolve callback for startMotorAndWaitReady
  const readyWaitersRef = useRef<Array<() => void>>([]);

  // ── Serial write ──────────────────────────────────────────────────────────

  const writeSerial = useCallback(async (data: Uint8Array) => {
    if (!serialWriterRef.current) throw new Error("Serial not connected");
    await serialWriterRef.current.write(data);
  }, []);

  // ── USB write ─────────────────────────────────────────────────────────────

  const writeUSB = useCallback(async (data: Uint8Array) => {
    const dev = usbDeviceRef.current;
    if (!dev) throw new Error("USB not connected");
    await dev.transferOut(usbEndpointOutRef.current, data);
  }, []);

  // ── Generic send ─────────────────────────────────────────────────────────

  const sendCommand = useCallback(
    async (cmd: string) => {
      const data = encodeCmd(cmd);
      try {
        if (activeBackendRef.current === "serial") {
          await writeSerial(data);
        } else if (activeBackendRef.current === "usb") {
          await writeUSB(data);
        } else {
          throw new Error("Not connected");
        }
        console.debug("[Motor] → ", cmd);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        throw err;
      }
    },
    [writeSerial, writeUSB]
  );

  // ── Process an inbound line from the firmware ─────────────────────────────

  const processLine = useCallback((line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    console.debug("[Motor] ← ", trimmed);
    setLastStatus(trimmed);

    const isReady = READY_TOKENS.some((tok) => trimmed.includes(tok));
    const isStopped =
      trimmed.includes('"running":false') ||
      trimmed === "STOPPED";
    const isBootConfirm = trimmed === BOOT_TOKEN;

    if (isBootConfirm) {
      console.info("[Motor] ESP32 boot confirmed");
      // Don't touch isRunning — board just (re)booted
      return;
    }

    if (isReady) {
      setIsRunning(true);
      // Resolve all pending startMotorAndWaitReady callers
      const waiters = readyWaitersRef.current.splice(0);
      waiters.forEach((resolve) => resolve());
    }

    if (isStopped) {
      setIsRunning(false);
    }
  }, []);

  // ── Serial reader loop ────────────────────────────────────────────────────

  const startSerialReader = useCallback(async () => {
    const port = serialPortRef.current;
    if (!port?.readable) return;

    readerLoopRef.current = true;
    const reader = port.readable.getReader();
    serialReaderRef.current = reader;

    let buffer = "";
    try {
      while (readerLoopRef.current) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) processLine(line);
      }
    } catch {
      // reader cancelled — normal on disconnect
    } finally {
      reader.releaseLock();
    }
  }, [processLine]);

  // ── Connect — WebSerial ───────────────────────────────────────────────────

  const connectSerial = useCallback(async () => {
    if (!("serial" in navigator)) throw new Error("WebSerial not supported");

    setConnectionState("connecting");
    setError(null);

    try {
      const port = await (navigator as Navigator & {
        serial: { requestPort(): Promise<SerialPort> };
      }).serial.requestPort();
      await port.open({ baudRate: 115200 });

      serialPortRef.current = port;
      activeBackendRef.current = "serial";

      if (port.writable) {
        serialWriterRef.current = port.writable.getWriter();
      }

      setConnectionState("connected");
      startSerialReader();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setConnectionState("error");
      throw err;
    }
  }, [startSerialReader]);

  // ── Connect — WebUSB ─────────────────────────────────────────────────────

  const connectUSB = useCallback(async () => {
    if (!("usb" in navigator)) throw new Error("WebUSB not supported");

    setConnectionState("connecting");
    setError(null);

    try {
      const device = await (navigator as Navigator & {
        usb: { requestDevice(options: { filters: unknown[] }): Promise<USBDevice> };
      }).usb.requestDevice({ filters: [] });

      await device.open();
      if (device.configuration === null) await device.selectConfiguration(1);

      const iface = device.configuration?.interfaces?.[0];
      if (!iface) throw new Error("No USB interface found");
      await device.claimInterface(iface.interfaceNumber);

      const alternate = iface.alternates[0];
      for (const ep of alternate.endpoints) {
        if (ep.type === "bulk" && ep.direction === "out") {
          usbEndpointOutRef.current = ep.endpointNumber;
        }
        if (ep.type === "bulk" && ep.direction === "in") {
          usbEndpointInRef.current = ep.endpointNumber;
        }
      }

      usbDeviceRef.current = device;
      activeBackendRef.current = "usb";
      setConnectionState("connected");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setConnectionState("error");
      throw err;
    }
  }, []);

  // ── Connect (public) ─────────────────────────────────────────────────────

  const connect = useCallback(
    async (backend: MotorBackend = "serial") => {
      if (backend === "serial") {
        await connectSerial();
      } else {
        await connectUSB();
      }
    },
    [connectSerial, connectUSB]
  );

  // ── Disconnect ────────────────────────────────────────────────────────────

  const disconnect = useCallback(async () => {
    readerLoopRef.current = false;

    // Flush any pending waiters so they don't hang forever
    const waiters = readyWaitersRef.current.splice(0);
    waiters.forEach((resolve) => resolve());

    try {
      if (serialWriterRef.current) {
        await serialWriterRef.current.releaseLock();
        serialWriterRef.current = null;
      }
      if (serialReaderRef.current) {
        await serialReaderRef.current.cancel();
        serialReaderRef.current = null;
      }
      if (serialPortRef.current) {
        await serialPortRef.current.close();
        serialPortRef.current = null;
      }
    } catch {
      // ignore close errors
    }

    try {
      if (usbDeviceRef.current) {
        await usbDeviceRef.current.close();
        usbDeviceRef.current = null;
      }
    } catch {
      // ignore
    }

    activeBackendRef.current = null;
    setConnectionState("disconnected");
    setIsRunning(false);
    setError(null);
  }, []);

  // ── Motor actions ─────────────────────────────────────────────────────────

  const startMotor = useCallback(
    async (config: MotorConfig) => {
      await sendCommand(`MOTOR:SPEED:${Math.round(config.speed)}`);
      await sendCommand(`MOTOR:DIR:${config.direction}`);
      await sendCommand(`MOTOR:TURNS:${config.turns}`);
      await sendCommand("MOTOR:START");
      setIsRunning(true);
    },
    [sendCommand]
  );

  /**
   * Start the motor and wait until the firmware acknowledges it is running
   * (READY or RUNNING response), or fall back after `timeoutMs`.
   *
   * This is the entry point for the recording sync sequence.
   */
  const startMotorAndWaitReady = useCallback(
    async (config: MotorConfig, timeoutMs = 3000) => {
      await sendCommand(`MOTOR:SPEED:${Math.round(config.speed)}`);
      await sendCommand(`MOTOR:DIR:${config.direction}`);
      await sendCommand(`MOTOR:TURNS:${config.turns}`);
      await sendCommand("MOTOR:START");
      setIsRunning(true);

      return new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          const idx = readyWaitersRef.current.indexOf(wrappedResolve);
          if (idx !== -1) readyWaitersRef.current.splice(idx, 1);
          console.warn("[Motor] startMotorAndWaitReady: timeout, proceeding without READY ack");
          resolve();
        }, timeoutMs);

        const wrappedResolve = () => {
          clearTimeout(timer);
          resolve();
        };

        readyWaitersRef.current.push(wrappedResolve);
      });
    },
    [sendCommand]
  );

  const stopMotor = useCallback(async () => {
    await sendCommand("MOTOR:STOP");
    setIsRunning(false);
  }, [sendCommand]);

  const resetMotor = useCallback(async () => {
    await sendCommand("MOTOR:RESET");
    setIsRunning(false);
  }, [sendCommand]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      readerLoopRef.current = false;
      readyWaitersRef.current.splice(0);
      serialWriterRef.current?.releaseLock();
      serialPortRef.current?.close().catch(() => undefined);
      usbDeviceRef.current?.close().catch(() => undefined);
    };
  }, []);

  return {
    isSupported,
    connectionState,
    error,
    isRunning,
    lastStatus,
    connect,
    disconnect,
    startMotor,
    startMotorAndWaitReady,
    stopMotor,
    resetMotor,
    sendCommand,
  };
}
