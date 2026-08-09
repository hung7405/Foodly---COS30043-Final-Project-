import { IsInt, IsOptional, IsString, Min, Max, MaxLength } from 'class-validator'

export class CreateFeedbackDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string

  @IsOptional()
  @IsString()
  @MaxLength(30)
  refCode?: string
}