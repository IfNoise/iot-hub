/**
 * Device mappers - преобразование между database и contract типами
 */
import { type Device } from '@iot-hub/devices';
import { type DatabaseDevice } from '../database/schemas/devices.schema.js';

/**
 * Преобразование из database модели в contract тип
 */
export function dbDeviceToContract(dbDevice: DatabaseDevice): Device {
  return {
    id: dbDevice.id,
    deviceId: dbDevice.deviceId,
    name: dbDevice.name,
    type: dbDevice.type as Device['type'],
    description: dbDevice.description || undefined,
    status: dbDevice.status as Device['status'],
    lastSeen: dbDevice.lastSeen ? dbDevice.lastSeen.toISOString() : undefined,
    firmware: dbDevice.firmware || undefined,
    hardware: dbDevice.hardware || undefined,
    ownerId: dbDevice.ownerId,
    metadata: dbDevice.metadata || {},
    createdAt: dbDevice.createdAt.toISOString(),
    updatedAt: dbDevice.updatedAt.toISOString(),
  };
}

/**
 * Преобразование из contract типа в database модель для вставки
 */
export function contractDeviceToDb(
  device: Omit<Device, 'id' | 'createdAt' | 'updatedAt'>
): Omit<DatabaseDevice, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    deviceId: device.deviceId,
    name: device.name,
    type: device.type,
    description: device.description || null,
    status: device.status,
    lastSeen: device.lastSeen ? new Date(device.lastSeen) : null,
    firmware: device.firmware || null,
    hardware: device.hardware || null,
    ownerId: device.ownerId,
    metadata: device.metadata || null,
  };
}
