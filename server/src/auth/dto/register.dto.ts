import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsIn } from 'class-validator'

export class RegisterDto {
  @IsEmail()
  email: string

  @IsString()
  @MinLength(3)
  @MaxLength(30)
  username: string

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  deliveryAddress?: string

  @IsOptional()
  @IsIn(['user', 'merchant'])
  role?: 'user' | 'merchant'
}
