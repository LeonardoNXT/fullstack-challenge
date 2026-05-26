import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { WalletApplicationError } from "../../application";
import { WalletDomainError } from "../../domain";

export function mapWalletError(error: unknown): Error {
  if (error instanceof WalletApplicationError) {
    if (error.code === "WALLET_NOT_FOUND") {
      return new NotFoundException({ code: error.code, message: "Wallet not found" });
    }
  }

  if (error instanceof WalletDomainError) {
    if (error.code === "INSUFFICIENT_BALANCE") {
      return new UnprocessableEntityException({
        code: error.code,
        message: "Insufficient balance",
      });
    }

    return new ConflictException({ code: error.code, message: error.message });
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error("Unknown wallet error");
}
