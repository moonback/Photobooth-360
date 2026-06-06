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
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) {
            console.debug("[Motor] ← ", trimmed);
            setLastStatus(trimmed);
            // Parse running state from firmware responses
            if (trimmed.includes('"running":true') || trimmed === "RUNNING") setIsRunning(true);
            if (trimmed.includes('"running":false') || trimmed === "STOPPED") setIsRunning(false);
          }
        }
      }
    } catch {
      // reader cancelled — normal on disconnect
    } finally {
      reader.releaseLock();
    }
  }, []);

  // ── Connect — WebSerial ───────────────────────────────────────────────────

  const connectSerial = useCallback(async () => {
    if (!("serial" in navigator)) throw new Error("WebSerial not supported");

    setConnectionState("connecting");
    setError(null);

    try {
      const port = await (navigator as Navigator & { serial: { requestPort(): Promise<SerialPort> } }).serial.requestPort();
      await port.open({ baudRate: 115200 });

      serialPortRef.current = port;
      activeBackendRef.current = "serial";

      if (port.writable) {
        serialWriterRef.current = port.writable.getWriter();
      }

      setConnectionState("connected");
      // Start background reader
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

      // Find bulk-OUT and bulk-IN endpoints on first interface
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
      // Non-async cleanup
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
    stopMotor,
    resetMotor,
    sendCommand,
  };
}
