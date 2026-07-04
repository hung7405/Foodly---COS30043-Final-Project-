import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator'
import { PaymentProvider } from '../entities/payment.entity'

export class CreatePaymentDto {
  @IsString()
  reservationId: string

  @IsNumber()
  amount: number

  @IsOptional()
  @IsEnum(PaymentProvider)
  provider?: PaymentProvider
}
