import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator'

export class CreateTicketDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string

  @IsOptional()
  @IsString()
  @MaxLength(120)
  subject?: string

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message: string
}
