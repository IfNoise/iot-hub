import { createZodDto } from 'nestjs-zod';
import {
  CreateOrganizationSchema,
  UpdateOrganizationSchema,
  OrganizationQuerySchema,
} from '@iot-hub/users';

export class CreateOrganizationDto extends createZodDto(
  CreateOrganizationSchema
) {}
export class UpdateOrganizationDto extends createZodDto(
  UpdateOrganizationSchema
) {}
export class OrganizationQueryDto extends createZodDto(
  OrganizationQuerySchema
) {}
