import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { GameApplicationError } from "../../application";
import { GameDomainError } from "../../domain";

export function mapGameError(error: unknown): Error {
  if (error instanceof GameApplicationError) {
    if (error.code === "CURRENT_ROUND_NOT_FOUND" || error.code === "ROUND_NOT_FOUND") {
      return new NotFoundException({ code: error.code, message: "Round not found" });
    }
  }

  if (error instanceof GameDomainError) {
    if (
      error.code === "INVALID_BET_AMOUNT" ||
      error.code === "INVALID_AUTO_CASHOUT_MULTIPLIER"
    ) {
      return new UnprocessableEntityException({
        code: error.code,
        message: error.message,
      });
    }

    return new ConflictException({ code: error.code, message: error.message });
  }

  if (error instanceof Error) {
    if (
      error.message === "INVALID_CENTS" ||
      error.message === "INVALID_MULTIPLIER_BPS"
    ) {
      return new UnprocessableEntityException({
        code: error.message,
        message: "Invalid request body",
      });
    }

    return error;
  }

  return new Error("Unknown game error");
}
