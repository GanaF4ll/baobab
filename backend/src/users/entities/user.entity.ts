import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';

export class UserEntity {
  @IsUUID()
  @ApiProperty({ description: 'UUID of the user' })
  id: string;

  @IsEmail()
  @ApiProperty({ description: 'Email of the user' })
  email: string;

  @IsString()
  @ApiProperty({ description: 'Hashed password of the user' })
  passwordHash: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'First name of the user', required: false })
  firstName?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'Last name of the user', required: false })
  lastName?: string;

  @IsDateString()
  @ApiProperty({ description: 'Creation date of the user' })
  createdAt: Date;

  @IsDateString()
  @ApiProperty({ description: 'Update date of the user' })
  updatedAt: Date;
}
