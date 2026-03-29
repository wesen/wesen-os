# Host Publish Failure Capture

- repo: `wesen/wesen-os`
- run_id: `23718753340`

## Job Summary

{"conclusion":"failure","jobs":[{"completedAt":"2026-03-29T20:52:21Z","conclusion":"failure","databaseId":69090093483,"name":"publish","startedAt":"2026-03-29T20:49:44Z","status":"completed","steps":[{"conclusion":"success","name":"Set up job","number":1,"status":"completed"},{"conclusion":"success","name":"Checkout","number":2,"status":"completed"},{"conclusion":"success","name":"Setup pnpm","number":3,"status":"completed"},{"conclusion":"success","name":"Setup Node","number":4,"status":"completed"},{"conclusion":"success","name":"Install dependencies","number":5,"status":"completed"},{"conclusion":"success","name":"Build launcher binary","number":6,"status":"completed"},{"conclusion":"success","name":"Log in to GHCR","number":7,"status":"completed"},{"conclusion":"success","name":"Extract Docker metadata","number":8,"status":"completed"},{"conclusion":"failure","name":"Build and optionally push image","number":9,"status":"completed"},{"conclusion":"skipped","name":"Summarize published image refs","number":10,"status":"completed"},{"conclusion":"success","name":"Post Build and optionally push image","number":16,"status":"completed"},{"conclusion":"success","name":"Post Log in to GHCR","number":17,"status":"completed"},{"conclusion":"skipped","name":"Post Setup Node","number":18,"status":"completed"},{"conclusion":"success","name":"Post Setup pnpm","number":19,"status":"completed"},{"conclusion":"success","name":"Post Checkout","number":20,"status":"completed"},{"conclusion":"success","name":"Complete job","number":21,"status":"completed"}],"url":"https://github.com/wesen/wesen-os/actions/runs/23718753340/job/69090093483"}],"status":"completed","url":"https://github.com/wesen/wesen-os/actions/runs/23718753340"}

## Failed Logs

publish	Build and optionally push image	﻿2026-03-29T20:52:17.7640997Z ##[group]Run docker/build-push-action@v6
publish	Build and optionally push image	2026-03-29T20:52:17.7641275Z with:
publish	Build and optionally push image	2026-03-29T20:52:17.7641429Z   context: .
publish	Build and optionally push image	2026-03-29T20:52:17.7641598Z   file: ./Dockerfile
publish	Build and optionally push image	2026-03-29T20:52:17.7641761Z   push: true
publish	Build and optionally push image	2026-03-29T20:52:17.7642015Z   tags: ghcr.io/wesen/wesen-os:main
publish	Build and optionally push image	ghcr.io/wesen/wesen-os:sha-bad54d2
publish	Build and optionally push image	2026-03-29T20:52:17.7643687Z   labels: org.opencontainers.image.created=2026-03-29T20:52:17.699Z
publish	Build and optionally push image	org.opencontainers.image.description=
publish	Build and optionally push image	org.opencontainers.image.licenses=MIT
publish	Build and optionally push image	org.opencontainers.image.revision=bad54d2e0943d085abb32e8066f2e00587cf5c2c
publish	Build and optionally push image	org.opencontainers.image.source=https://github.com/wesen/wesen-os
publish	Build and optionally push image	org.opencontainers.image.title=wesen-os
publish	Build and optionally push image	org.opencontainers.image.url=https://github.com/wesen/wesen-os
publish	Build and optionally push image	org.opencontainers.image.version=main
publish	Build and optionally push image	2026-03-29T20:52:17.7645394Z   cache-from: type=gha
publish	Build and optionally push image	2026-03-29T20:52:17.7645675Z   cache-to: type=gha,mode=max
publish	Build and optionally push image	2026-03-29T20:52:17.7646045Z   load: false
publish	Build and optionally push image	2026-03-29T20:52:17.7646274Z   no-cache: false
publish	Build and optionally push image	2026-03-29T20:52:17.7646523Z   pull: false
publish	Build and optionally push image	2026-03-29T20:52:17.7647005Z   github-token: ***
publish	Build and optionally push image	2026-03-29T20:52:17.7647418Z env:
publish	Build and optionally push image	2026-03-29T20:52:17.7647667Z   SHOULD_PUSH: true
publish	Build and optionally push image	2026-03-29T20:52:17.7647941Z   PNPM_HOME: /home/runner/setup-pnpm/node_modules/.bin
publish	Build and optionally push image	2026-03-29T20:52:17.7648325Z   DOCKER_METADATA_OUTPUT_VERSION: main
publish	Build and optionally push image	2026-03-29T20:52:17.7648742Z   DOCKER_METADATA_OUTPUT_TAGS: ghcr.io/wesen/wesen-os:main
publish	Build and optionally push image	ghcr.io/wesen/wesen-os:sha-bad54d2
publish	Build and optionally push image	2026-03-29T20:52:17.7649276Z   DOCKER_METADATA_OUTPUT_TAG_NAMES: main
publish	Build and optionally push image	sha-bad54d2
publish	Build and optionally push image	2026-03-29T20:52:17.7650959Z   DOCKER_METADATA_OUTPUT_LABELS: org.opencontainers.image.created=2026-03-29T20:52:17.699Z
publish	Build and optionally push image	org.opencontainers.image.description=
publish	Build and optionally push image	org.opencontainers.image.licenses=MIT
publish	Build and optionally push image	org.opencontainers.image.revision=bad54d2e0943d085abb32e8066f2e00587cf5c2c
publish	Build and optionally push image	org.opencontainers.image.source=https://github.com/wesen/wesen-os
publish	Build and optionally push image	org.opencontainers.image.title=wesen-os
publish	Build and optionally push image	org.opencontainers.image.url=https://github.com/wesen/wesen-os
publish	Build and optionally push image	org.opencontainers.image.version=main
publish	Build and optionally push image	2026-03-29T20:52:17.7654255Z   DOCKER_METADATA_OUTPUT_ANNOTATIONS: manifest:org.opencontainers.image.created=2026-03-29T20:52:17.699Z
publish	Build and optionally push image	manifest:org.opencontainers.image.description=
publish	Build and optionally push image	manifest:org.opencontainers.image.licenses=MIT
publish	Build and optionally push image	manifest:org.opencontainers.image.revision=bad54d2e0943d085abb32e8066f2e00587cf5c2c
publish	Build and optionally push image	manifest:org.opencontainers.image.source=https://github.com/wesen/wesen-os
publish	Build and optionally push image	manifest:org.opencontainers.image.title=wesen-os
publish	Build and optionally push image	manifest:org.opencontainers.image.url=https://github.com/wesen/wesen-os
publish	Build and optionally push image	manifest:org.opencontainers.image.version=main
publish	Build and optionally push image	2026-03-29T20:52:17.7659692Z   DOCKER_METADATA_OUTPUT_JSON: {"tags":["ghcr.io/wesen/wesen-os:main","ghcr.io/wesen/wesen-os:sha-bad54d2"],"tag-names":["main","sha-bad54d2"],"labels":{"org.opencontainers.image.created":"2026-03-29T20:52:17.699Z","org.opencontainers.image.description":"","org.opencontainers.image.licenses":"MIT","org.opencontainers.image.revision":"bad54d2e0943d085abb32e8066f2e00587cf5c2c","org.opencontainers.image.source":"https://github.com/wesen/wesen-os","org.opencontainers.image.title":"wesen-os","org.opencontainers.image.url":"https://github.com/wesen/wesen-os","org.opencontainers.image.version":"main"},"annotations":["manifest:org.opencontainers.image.created=2026-03-29T20:52:17.699Z","manifest:org.opencontainers.image.description=","manifest:org.opencontainers.image.licenses=MIT","manifest:org.opencontainers.image.revision=bad54d2e0943d085abb32e8066f2e00587cf5c2c","manifest:org.opencontainers.image.source=https://github.com/wesen/wesen-os","manifest:org.opencontainers.image.title=wesen-os","manifest:org.opencontainers.image.url=https://github.com/wesen/wesen-os","manifest:org.opencontainers.image.version=main"]}
publish	Build and optionally push image	2026-03-29T20:52:17.7663995Z   DOCKER_METADATA_OUTPUT_BAKE_FILE_TAGS: /home/runner/work/_temp/docker-actions-toolkit-SOIFxz/docker-metadata-action-bake-tags.json
publish	Build and optionally push image	2026-03-29T20:52:17.7664872Z   DOCKER_METADATA_OUTPUT_BAKE_FILE_LABELS: /home/runner/work/_temp/docker-actions-toolkit-SOIFxz/docker-metadata-action-bake-labels.json
publish	Build and optionally push image	2026-03-29T20:52:17.7665827Z   DOCKER_METADATA_OUTPUT_BAKE_FILE_ANNOTATIONS: /home/runner/work/_temp/docker-actions-toolkit-SOIFxz/docker-metadata-action-bake-annotations.json
publish	Build and optionally push image	2026-03-29T20:52:17.7666921Z   DOCKER_METADATA_OUTPUT_BAKE_FILE: /home/runner/work/_temp/docker-actions-toolkit-SOIFxz/docker-metadata-action-bake.json
publish	Build and optionally push image	2026-03-29T20:52:17.7667654Z ##[endgroup]
publish	Build and optionally push image	2026-03-29T20:52:17.9840087Z ##[group]GitHub Actions runtime token ACs
publish	Build and optionally push image	2026-03-29T20:52:17.9849993Z refs/heads/main: read/write
publish	Build and optionally push image	2026-03-29T20:52:17.9852386Z ##[endgroup]
publish	Build and optionally push image	2026-03-29T20:52:17.9853488Z ##[group]Docker info
publish	Build and optionally push image	2026-03-29T20:52:17.9924928Z [command]/usr/bin/docker version
publish	Build and optionally push image	2026-03-29T20:52:18.0117256Z Client: Docker Engine - Community
publish	Build and optionally push image	2026-03-29T20:52:18.0118697Z  Version:           28.0.4
publish	Build and optionally push image	2026-03-29T20:52:18.0119803Z  API version:       1.48
publish	Build and optionally push image	2026-03-29T20:52:18.0120931Z  Go version:        go1.23.7
publish	Build and optionally push image	2026-03-29T20:52:18.0122084Z  Git commit:        b8034c0
publish	Build and optionally push image	2026-03-29T20:52:18.0122626Z  Built:             Tue Mar 25 15:07:16 2025
publish	Build and optionally push image	2026-03-29T20:52:18.0123197Z  OS/Arch:           linux/amd64
publish	Build and optionally push image	2026-03-29T20:52:18.0123752Z  Context:           default
publish	Build and optionally push image	2026-03-29T20:52:18.0124041Z 
publish	Build and optionally push image	2026-03-29T20:52:18.0124237Z Server: Docker Engine - Community
publish	Build and optionally push image	2026-03-29T20:52:18.0124505Z  Engine:
publish	Build and optionally push image	2026-03-29T20:52:18.0124794Z   Version:          28.0.4
publish	Build and optionally push image	2026-03-29T20:52:18.0125088Z   API version:      1.48 (minimum version 1.24)
publish	Build and optionally push image	2026-03-29T20:52:18.0125445Z   Go version:       go1.23.7
publish	Build and optionally push image	2026-03-29T20:52:18.0125783Z   Git commit:       6430e49
publish	Build and optionally push image	2026-03-29T20:52:18.0126066Z   Built:            Tue Mar 25 15:07:16 2025
publish	Build and optionally push image	2026-03-29T20:52:18.0126396Z   OS/Arch:          linux/amd64
publish	Build and optionally push image	2026-03-29T20:52:18.0126724Z   Experimental:     false
publish	Build and optionally push image	2026-03-29T20:52:18.0126971Z  containerd:
publish	Build and optionally push image	2026-03-29T20:52:18.0127460Z   Version:          v2.2.2
publish	Build and optionally push image	2026-03-29T20:52:18.0127879Z   GitCommit:        301b2dac98f15c27117da5c8af12118a041a31d9
publish	Build and optionally push image	2026-03-29T20:52:18.0128201Z  runc:
publish	Build and optionally push image	2026-03-29T20:52:18.0128441Z   Version:          1.3.4
publish	Build and optionally push image	2026-03-29T20:52:18.0128748Z   GitCommit:        v1.3.4-0-gd6d73eb8
publish	Build and optionally push image	2026-03-29T20:52:18.0129093Z  docker-init:
publish	Build and optionally push image	2026-03-29T20:52:18.0129341Z   Version:          0.19.0
publish	Build and optionally push image	2026-03-29T20:52:18.0129613Z   GitCommit:        de40ad0
publish	Build and optionally push image	2026-03-29T20:52:18.0154393Z [command]/usr/bin/docker info
publish	Build and optionally push image	2026-03-29T20:52:18.1507947Z Client: Docker Engine - Community
publish	Build and optionally push image	2026-03-29T20:52:18.1509298Z  Version:    28.0.4
publish	Build and optionally push image	2026-03-29T20:52:18.1509822Z  Context:    default
publish	Build and optionally push image	2026-03-29T20:52:18.1510080Z  Debug Mode: false
publish	Build and optionally push image	2026-03-29T20:52:18.1510436Z  Plugins:
publish	Build and optionally push image	2026-03-29T20:52:18.1510729Z   buildx: Docker Buildx (Docker Inc.)
publish	Build and optionally push image	2026-03-29T20:52:18.1511024Z     Version:  v0.32.1
publish	Build and optionally push image	2026-03-29T20:52:18.1511438Z     Path:     /usr/libexec/docker/cli-plugins/docker-buildx
publish	Build and optionally push image	2026-03-29T20:52:18.1511810Z   compose: Docker Compose (Docker Inc.)
publish	Build and optionally push image	2026-03-29T20:52:18.1512154Z     Version:  v2.38.2
publish	Build and optionally push image	2026-03-29T20:52:18.1512553Z     Path:     /usr/libexec/docker/cli-plugins/docker-compose
publish	Build and optionally push image	2026-03-29T20:52:18.1512792Z 
publish	Build and optionally push image	2026-03-29T20:52:18.1512926Z Server:
publish	Build and optionally push image	2026-03-29T20:52:18.1513165Z  Containers: 0
publish	Build and optionally push image	2026-03-29T20:52:18.1513450Z   Running: 0
publish	Build and optionally push image	2026-03-29T20:52:18.1513677Z   Paused: 0
publish	Build and optionally push image	2026-03-29T20:52:18.1513912Z   Stopped: 0
publish	Build and optionally push image	2026-03-29T20:52:18.1514165Z  Images: 6
publish	Build and optionally push image	2026-03-29T20:52:18.1514416Z  Server Version: 28.0.4
publish	Build and optionally push image	2026-03-29T20:52:18.1514699Z  Storage Driver: overlay2
publish	Build and optionally push image	2026-03-29T20:52:18.1514979Z   Backing Filesystem: extfs
publish	Build and optionally push image	2026-03-29T20:52:18.1515297Z   Supports d_type: true
publish	Build and optionally push image	2026-03-29T20:52:18.1515618Z   Using metacopy: false
publish	Build and optionally push image	2026-03-29T20:52:18.1515891Z   Native Overlay Diff: false
publish	Build and optionally push image	2026-03-29T20:52:18.1516256Z   userxattr: false
publish	Build and optionally push image	2026-03-29T20:52:18.1516489Z  Logging Driver: json-file
publish	Build and optionally push image	2026-03-29T20:52:18.1516795Z  Cgroup Driver: systemd
publish	Build and optionally push image	2026-03-29T20:52:18.1517285Z  Cgroup Version: 2
publish	Build and optionally push image	2026-03-29T20:52:18.1517627Z  Plugins:
publish	Build and optionally push image	2026-03-29T20:52:18.1517915Z   Volume: local
publish	Build and optionally push image	2026-03-29T20:52:18.1518244Z   Network: bridge host ipvlan macvlan null overlay
publish	Build and optionally push image	2026-03-29T20:52:18.1518696Z   Log: awslogs fluentd gcplogs gelf journald json-file local splunk syslog
publish	Build and optionally push image	2026-03-29T20:52:18.1519123Z  Swarm: inactive
publish	Build and optionally push image	2026-03-29T20:52:18.1519447Z  Runtimes: io.containerd.runc.v2 runc
publish	Build and optionally push image	2026-03-29T20:52:18.1519736Z  Default Runtime: runc
publish	Build and optionally push image	2026-03-29T20:52:18.1520333Z  Init Binary: docker-init
publish	Build and optionally push image	2026-03-29T20:52:18.1520698Z  containerd version: 301b2dac98f15c27117da5c8af12118a041a31d9
publish	Build and optionally push image	2026-03-29T20:52:18.1521117Z  runc version: v1.3.4-0-gd6d73eb8
publish	Build and optionally push image	2026-03-29T20:52:18.1521570Z  init version: de40ad0
publish	Build and optionally push image	2026-03-29T20:52:18.1521895Z  Security Options:
publish	Build and optionally push image	2026-03-29T20:52:18.1522151Z   apparmor
publish	Build and optionally push image	2026-03-29T20:52:18.1522528Z   seccomp
publish	Build and optionally push image	2026-03-29T20:52:18.1522749Z    Profile: builtin
publish	Build and optionally push image	2026-03-29T20:52:18.1522998Z   cgroupns
publish	Build and optionally push image	2026-03-29T20:52:18.1523250Z  Kernel Version: 6.17.0-1008-azure
publish	Build and optionally push image	2026-03-29T20:52:18.1523630Z  Operating System: Ubuntu 24.04.4 LTS
publish	Build and optionally push image	2026-03-29T20:52:18.1523930Z  OSType: linux
publish	Build and optionally push image	2026-03-29T20:52:18.1524139Z  Architecture: x86_64
publish	Build and optionally push image	2026-03-29T20:52:18.1524587Z  CPUs: 4
publish	Build and optionally push image	2026-03-29T20:52:18.1524836Z  Total Memory: 15.61GiB
publish	Build and optionally push image	2026-03-29T20:52:18.1525085Z  Name: runnervmrg6be
publish	Build and optionally push image	2026-03-29T20:52:18.1525438Z  ID: 26c853c4-ebf5-403c-a446-44e39e017c08
publish	Build and optionally push image	2026-03-29T20:52:18.1525752Z  Docker Root Dir: /var/lib/docker
publish	Build and optionally push image	2026-03-29T20:52:18.1526035Z  Debug Mode: false
publish	Build and optionally push image	2026-03-29T20:52:18.1526354Z  Username: githubactions
publish	Build and optionally push image	2026-03-29T20:52:18.1526602Z  Experimental: false
publish	Build and optionally push image	2026-03-29T20:52:18.1526879Z  Insecure Registries:
publish	Build and optionally push image	2026-03-29T20:52:18.1527388Z   ::1/128
publish	Build and optionally push image	2026-03-29T20:52:18.1527597Z   127.0.0.0/8
publish	Build and optionally push image	2026-03-29T20:52:18.1527840Z  Live Restore Enabled: false
publish	Build and optionally push image	2026-03-29T20:52:18.1528070Z 
publish	Build and optionally push image	2026-03-29T20:52:18.1528776Z ##[endgroup]
publish	Build and optionally push image	2026-03-29T20:52:18.1529442Z ##[group]Proxy configuration
publish	Build and optionally push image	2026-03-29T20:52:18.1529875Z No proxy configuration found
publish	Build and optionally push image	2026-03-29T20:52:18.1530338Z ##[endgroup]
publish	Build and optionally push image	2026-03-29T20:52:18.2134981Z ##[group]Buildx version
publish	Build and optionally push image	2026-03-29T20:52:18.2158116Z [command]/usr/bin/docker buildx version
publish	Build and optionally push image	2026-03-29T20:52:18.2703665Z github.com/docker/buildx v0.32.1 d3bfb3f4e48a67dda56e957a6636f4fab6c5fcb2
publish	Build and optionally push image	2026-03-29T20:52:18.2731091Z ##[endgroup]
publish	Build and optionally push image	2026-03-29T20:52:18.2731758Z ##[group]Builder info
publish	Build and optionally push image	2026-03-29T20:52:18.3593947Z {
publish	Build and optionally push image	2026-03-29T20:52:18.3596427Z   "nodes": [
publish	Build and optionally push image	2026-03-29T20:52:18.3596837Z     {
publish	Build and optionally push image	2026-03-29T20:52:18.3597609Z       "name": "default",
publish	Build and optionally push image	2026-03-29T20:52:18.3598474Z       "endpoint": "default",
publish	Build and optionally push image	2026-03-29T20:52:18.3599022Z       "status": "running",
publish	Build and optionally push image	2026-03-29T20:52:18.3599595Z       "buildkit": "v0.20.2",
publish	Build and optionally push image	2026-03-29T20:52:18.3600761Z       "platforms": "linux/amd64,linux/amd64/v2,linux/amd64/v3,linux/amd64/v4,linux/386",
publish	Build and optionally push image	2026-03-29T20:52:18.3601720Z       "features": {
publish	Build and optionally push image	2026-03-29T20:52:18.3602249Z         "Automatically load images to the Docker Engine image store": true,
publish	Build and optionally push image	2026-03-29T20:52:18.3603280Z         "Cache export": true,
publish	Build and optionally push image	2026-03-29T20:52:18.3603579Z         "Direct push": true,
publish	Build and optionally push image	2026-03-29T20:52:18.3604077Z         "Docker exporter": true,
publish	Build and optionally push image	2026-03-29T20:52:18.3604959Z         "Multi-platform build": true,
publish	Build and optionally push image	2026-03-29T20:52:18.3605668Z         "OCI exporter": true
publish	Build and optionally push image	2026-03-29T20:52:18.3606200Z       },
publish	Build and optionally push image	2026-03-29T20:52:18.3606779Z       "labels": {
publish	Build and optionally push image	2026-03-29T20:52:18.3607754Z         "org.mobyproject.buildkit.worker.moby.host-gateway-ip": "172.17.0.1"
publish	Build and optionally push image	2026-03-29T20:52:18.3608821Z       }
publish	Build and optionally push image	2026-03-29T20:52:18.3609587Z     }
publish	Build and optionally push image	2026-03-29T20:52:18.3610199Z   ],
publish	Build and optionally push image	2026-03-29T20:52:18.3610514Z   "name": "default",
publish	Build and optionally push image	2026-03-29T20:52:18.3610977Z   "driver": "docker"
publish	Build and optionally push image	2026-03-29T20:52:18.3611404Z }
publish	Build and optionally push image	2026-03-29T20:52:18.3612179Z ##[endgroup]
publish	Build and optionally push image	2026-03-29T20:52:18.5041006Z [command]/usr/bin/docker buildx build --cache-from type=gha --cache-to type=gha,mode=max --file ./Dockerfile --iidfile /home/runner/work/_temp/docker-actions-toolkit-QQNMVy/build-iidfile-24b3f56e71.txt --label org.opencontainers.image.created=2026-03-29T20:52:17.699Z --label org.opencontainers.image.description= --label org.opencontainers.image.licenses=MIT --label org.opencontainers.image.revision=bad54d2e0943d085abb32e8066f2e00587cf5c2c --label org.opencontainers.image.source=https://github.com/wesen/wesen-os --label org.opencontainers.image.title=wesen-os --label org.opencontainers.image.url=https://github.com/wesen/wesen-os --label org.opencontainers.image.version=main --tag ghcr.io/wesen/wesen-os:main --tag ghcr.io/wesen/wesen-os:sha-bad54d2 --metadata-file /home/runner/work/_temp/docker-actions-toolkit-QQNMVy/build-metadata-65b2039e0f.json --push .
publish	Build and optionally push image	2026-03-29T20:52:18.5832337Z ERROR: failed to build: Cache export is not supported for the docker driver.
publish	Build and optionally push image	2026-03-29T20:52:18.5833206Z Switch to a different driver, or turn on the containerd image store, and try again.
publish	Build and optionally push image	2026-03-29T20:52:18.5833821Z Learn more at https://docs.docker.com/go/build-cache-backends/
publish	Build and optionally push image	2026-03-29T20:52:18.5862029Z ##[group]Reference
publish	Build and optionally push image	2026-03-29T20:52:18.6534229Z No build reference found
publish	Build and optionally push image	2026-03-29T20:52:18.6535220Z ##[endgroup]
publish	Build and optionally push image	2026-03-29T20:52:18.6535643Z ##[group]Check build summary support
publish	Build and optionally push image	2026-03-29T20:52:18.6537654Z Build summary requires a build reference
publish	Build and optionally push image	2026-03-29T20:52:18.6538245Z ##[endgroup]
publish	Build and optionally push image	2026-03-29T20:52:18.6558698Z ##[error]buildx failed with: Learn more at https://docs.docker.com/go/build-cache-backends/
