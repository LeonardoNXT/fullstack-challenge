import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class PlaceBetRequestDto {
  @ApiProperty({ example: 1000, minimum: 100, maximum: 100000 })
  amountCents: number;

  @ApiPropertyOptional({ example: 15000, minimum: 10000 })
  autoCashoutMultiplierBps?: number;
}
