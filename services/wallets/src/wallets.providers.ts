import {
  CreateWalletUseCase,
  CreditWalletUseCase,
  DebitWalletUseCase,
  GetWalletUseCase,
  type WalletRepository,
} from "./application";
import { InMemoryWalletRepository } from "./infrastructure";

export const WALLET_REPOSITORY = Symbol("WALLET_REPOSITORY");

export const walletProviders = [
  {
    provide: WALLET_REPOSITORY,
    useClass: InMemoryWalletRepository,
  },
  {
    provide: CreateWalletUseCase,
    useFactory: (walletRepository: WalletRepository): CreateWalletUseCase =>
      new CreateWalletUseCase(walletRepository),
    inject: [WALLET_REPOSITORY],
  },
  {
    provide: GetWalletUseCase,
    useFactory: (walletRepository: WalletRepository): GetWalletUseCase =>
      new GetWalletUseCase(walletRepository),
    inject: [WALLET_REPOSITORY],
  },
  {
    provide: CreditWalletUseCase,
    useFactory: (walletRepository: WalletRepository): CreditWalletUseCase =>
      new CreditWalletUseCase(walletRepository),
    inject: [WALLET_REPOSITORY],
  },
  {
    provide: DebitWalletUseCase,
    useFactory: (walletRepository: WalletRepository): DebitWalletUseCase =>
      new DebitWalletUseCase(walletRepository),
    inject: [WALLET_REPOSITORY],
  },
];
