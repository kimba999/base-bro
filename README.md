# BAZA

**BAZA** — приложение на Base: кошелёк, локальный «кликер» с энергией, вывод наград в **$BAZA** в сеть и недельные **check-in** стрики по контракту токена.

## Контракт (Base Mainnet)

- [BazaToken на Basescan](https://basescan.org/address/0x685cD8bBC7EDac563024D798f19D12fdb2A89887#code)

## Репозиторий

- [Исходный код на GitHub](https://github.com/skimbas/base-puzzle)

## Стек

**Next.js** (React), **Tailwind CSS**, **wagmi** / **viem**; смарт-контракты и скрипты — **Foundry** в каталоге [`contract/`](./contract/).

## Локальный запуск

```bash
npm install
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000). Для ончейн-действий нужен кошелёк в сети **Base Mainnet**.
