/**
 * Типы для симулятора IoT устройства
 */

export interface SimulatorConfig {
  mqttHost: string;
  mqttPort: number;
  mqttSecurePort: number;
  userId: string;
  deviceId: string;
  keepalive: number;
  qos: 0 | 1 | 2;
  useTLS: boolean;
  certPath?: string;
  keyPath?: string;
  caPath?: string;
}

export interface DiscreteTimer {
  id: number;
  enabled: boolean;
  schedule: string;
  duration: number;
  channel: number;
  lastRun: string | null;
}

export interface AnalogTimer {
  id: number;
  enabled: boolean;
  schedule: string;
  value: number;
  channel: number;
  lastRun: string | null;
}

export interface DiscreteRegulator {
  id: number;
  enabled: boolean;
  sensor: string;
  target: number;
  hysteresis: number;
  channel: number;
  state: boolean;
}

export interface PIDConfig {
  p: number;
  i: number;
  d: number;
}

export interface AnalogRegulator {
  id: number;
  enabled: boolean;
  sensor: string;
  target: number;
  pid: PIDConfig;
  channel: number;
  value: number;
}

export interface Irrigator {
  id: number;
  enabled: boolean;
  schedule: string;
  duration: number;
  pump: number;
  moisture: number;
}

export interface DeviceState {
  status: 'online' | 'offline' | 'rebooting';
  uptime: number;
  temperature: number;
  humidity: number;
  pressure: number;
  discreteTimers: DiscreteTimer[];
  analogTimers: AnalogTimer[];
  discreteRegulators: DiscreteRegulator[];
  analogRegulators: AnalogRegulator[];
  irrigators: Irrigator[];
  lastUpdate: string;
}

export interface SensorData {
  temperature: number;
  humidity: number;
  pressure: number;
  timestamp: string;
}

export interface RPCRequest {
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface RPCResponse {
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
  };
}

export interface RebootResponse {
  success: boolean;
  message: string;
  estimatedTime: number;
}
