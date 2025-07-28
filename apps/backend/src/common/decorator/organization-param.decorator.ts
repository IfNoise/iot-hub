// src/common/decorators/organization-param.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const OrganizationParam = (param: string) =>
  SetMetadata('organizationParam', param);
