import { IsString, IsNumber, IsArray, IsOptional, Min, Max } from 'class-validator'

export class CreateDealDto {
  @IsString()
  title: string

  @IsOptional()
  @IsString()
  description?: string

  @IsNumber()
  @Min(0)
  originalPrice: number

  @IsNumber()
  @Min(0)
  discountPrice: number

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number

  @IsOptional()
  @IsString()
  address?: string

  @IsOptional()
  @IsString()
  storeId?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]

  @IsOptional()
  @IsNumber()
  @Min(1)
  remainingQuantity?: number

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[]

  @IsOptional()
  @IsString()
  expiresAt?: string

  @IsOptional()
  metadata?: Record<string, any>
}
