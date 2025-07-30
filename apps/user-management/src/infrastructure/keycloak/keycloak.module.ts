import { Module, Global } from '@nestjs/common';
import { KeycloakIntegrationService } from './keycloak-integration.service';

@Global()
@Module({
  providers: [KeycloakIntegrationService],
  exports: [KeycloakIntegrationService],
})
export class KeycloakModule {}
