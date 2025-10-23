import * as os from 'os';
import * as crypto from 'crypto';

const DEFAULT_EPOCH = Date.UTC(2025, 0, 1);
const TIMESTAMP_BITS = 41;
const MACHINE_BITS = 10;
const PID_BITS = 6;
const SEQUENCE_BITS = 7;

const TIMESTAMP_MOD = Math.pow(2, TIMESTAMP_BITS);
const MACHINE_MASK = Math.pow(2, MACHINE_BITS) - 1;
const PID_MASK = Math.pow(2, PID_BITS) - 1;
const SEQUENCE_MASK = Math.pow(2, SEQUENCE_BITS) - 1;

function computeMachineFingerprint(): number {
  try {
    const hostname = os.hostname() || 'default-host';
    const hash = crypto.createHash('sha256').update(hostname).digest();
    let value = 0;
    for (let i = 0; i < hash.length; i += 1) {
      value = (value << 8) ^ hash[i];
    }
    return value & MACHINE_MASK;
  } catch {
    return Math.floor(Math.random() * MACHINE_MASK);
  }
}

export class SnowflakeGenerator {
  private readonly epoch: number;

  private readonly machineId: number;

  private readonly pid: number;

  private sequence = 0;

  private lastTimestamp = -1;

  constructor(options?: { epoch?: number; machineId?: number; pid?: number }) {
    this.epoch = options?.epoch ?? DEFAULT_EPOCH;
    const machine = options?.machineId ?? computeMachineFingerprint();
    this.machineId = machine & MACHINE_MASK;
    const pid = options?.pid ?? process.pid;
    this.pid = pid & PID_MASK;
  }

  nextId(): string {
    let timestamp = this.currentTimestamp();
    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1) & SEQUENCE_MASK;
      if (this.sequence === 0) {
        timestamp = this.waitNextMillis(timestamp);
      }
    } else {
      this.sequence = 0;
    }
    this.lastTimestamp = timestamp;

    const timestampPart = padBase36(timestamp % TIMESTAMP_MOD, Math.ceil(TIMESTAMP_BITS / 5)); // base36 ~ 5 bits per char
    const machinePart = padBase36(this.machineId, Math.ceil(MACHINE_BITS / 5));
    const pidPart = padBase36(this.pid, Math.ceil(PID_BITS / 5));
    const seqPart = padBase36(this.sequence, Math.ceil(SEQUENCE_BITS / 5));
    return `${timestampPart}${machinePart}${pidPart}${seqPart}`;
  }

  private currentTimestamp(): number {
    return Date.now() - this.epoch;
  }

  private waitNextMillis(current: number): number {
    let timestamp = this.currentTimestamp();
    while (timestamp <= current) {
      timestamp = this.currentTimestamp();
    }
    return timestamp;
  }
}

export const defaultSnowflake = new SnowflakeGenerator();

function padBase36(value: number, length: number): string {
  const text = Math.max(0, value).toString(36);
  return text.padStart(length, '0').slice(-length);
}
