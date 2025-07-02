import { User } from '../entities/user.entity.js';
import { UserResponseDto } from '../dto/user-response.dto.js';

/**
 * Мапперы для преобразования сущностей в DTO
 */
export class UserMapper {
  /**
   * Преобразует сущность User в UserResponseDto
   */
  static toResponseDto(user: User): UserResponseDto {
    return {
      ...user,
      // Преобразуем undefined в null для соответствия схеме
      planExpiresAt: user.planExpiresAt ?? null,
    };
  }

  /**
   * Преобразует массив сущностей User в массив UserResponseDto
   */
  static toResponseDtos(users: User[]): UserResponseDto[] {
    return users.map((user) => this.toResponseDto(user));
  }
}
