# syntax=docker/dockerfile:1.7

FROM golang:1.26.1-bookworm AS go-toolchain

FROM node:22-bookworm-slim AS builder

RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential ca-certificates git \
  && rm -rf /var/lib/apt/lists/*

COPY --from=go-toolchain /usr/local/go /usr/local/go

ENV PATH="/usr/local/go/bin:${PATH}"
ENV CGO_ENABLED=1

WORKDIR /src

COPY . .

RUN corepack enable && corepack prepare pnpm@10.17.1 --activate
RUN pnpm install --frozen-lockfile
RUN npm run launcher:binary:build

FROM debian:bookworm-slim AS runtime

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates tini \
  && rm -rf /var/lib/apt/lists/* \
  && useradd --system --create-home --home-dir /app --uid 10001 app \
  && mkdir -p /app/data \
  && chown -R app:app /app

WORKDIR /app

COPY --from=builder /src/build/wesen-os-launcher /usr/local/bin/wesen-os-launcher

EXPOSE 8091

USER app

ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/wesen-os-launcher", "wesen-os-launcher"]
CMD ["--addr=:8091", "--arc-enabled=false"]
