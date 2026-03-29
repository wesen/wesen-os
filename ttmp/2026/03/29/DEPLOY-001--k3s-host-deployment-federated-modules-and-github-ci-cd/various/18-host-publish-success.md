# Host Publish Success Capture

- repo: `wesen/wesen-os`
- run_id: `23718834950`

## Run Summary

{"conclusion":"success","jobs":[{"completedAt":"2026-03-29T21:00:17Z","conclusion":"success","databaseId":69090304735,"name":"publish","startedAt":"2026-03-29T20:54:01Z","status":"completed","steps":[{"conclusion":"success","name":"Set up job","number":1,"status":"completed"},{"conclusion":"success","name":"Checkout","number":2,"status":"completed"},{"conclusion":"success","name":"Setup pnpm","number":3,"status":"completed"},{"conclusion":"success","name":"Setup Node","number":4,"status":"completed"},{"conclusion":"success","name":"Install dependencies","number":5,"status":"completed"},{"conclusion":"success","name":"Build launcher binary","number":6,"status":"completed"},{"conclusion":"success","name":"Set up Docker Buildx","number":7,"status":"completed"},{"conclusion":"success","name":"Log in to GHCR","number":8,"status":"completed"},{"conclusion":"success","name":"Extract Docker metadata","number":9,"status":"completed"},{"conclusion":"success","name":"Build and optionally push image","number":10,"status":"completed"},{"conclusion":"success","name":"Summarize published image refs","number":11,"status":"completed"},{"conclusion":"success","name":"Post Build and optionally push image","number":17,"status":"completed"},{"conclusion":"success","name":"Post Log in to GHCR","number":18,"status":"completed"},{"conclusion":"success","name":"Post Set up Docker Buildx","number":19,"status":"completed"},{"conclusion":"success","name":"Post Setup Node","number":20,"status":"completed"},{"conclusion":"success","name":"Post Setup pnpm","number":21,"status":"completed"},{"conclusion":"success","name":"Post Checkout","number":22,"status":"completed"},{"conclusion":"success","name":"Complete job","number":23,"status":"completed"}],"url":"https://github.com/wesen/wesen-os/actions/runs/23718834950/job/69090304735"}],"status":"completed","url":"https://github.com/wesen/wesen-os/actions/runs/23718834950"}

## Digest Lines

1173:publish	Build and optionally push image	2026-03-29T20:56:19.6398375Z #4 docker-image://docker.io/docker/dockerfile:1.7@sha256:a57df69d0ea827fb7266491f2813635de6f17269be881f696fbfdf2d83dda33e
1174:publish	Build and optionally push image	2026-03-29T20:56:19.6400384Z #4 resolve docker.io/docker/dockerfile:1.7@sha256:a57df69d0ea827fb7266491f2813635de6f17269be881f696fbfdf2d83dda33e done
1175:publish	Build and optionally push image	2026-03-29T20:56:19.6416588Z #4 sha256:96918c57e42509b97f10c074d80672ecdbd3bb7dcd38c1bd95960cf291207416 11.98MB / 11.98MB 0.1s done
1176:publish	Build and optionally push image	2026-03-29T20:56:19.7906184Z #4 extracting sha256:96918c57e42509b97f10c074d80672ecdbd3bb7dcd38c1bd95960cf291207416 0.1s done
1207:publish	Build and optionally push image	2026-03-29T20:56:20.1861428Z #13 [runtime 1/4] FROM docker.io/library/debian:bookworm-slim@sha256:f06537653ac770703bc45b4b113475bd402f451e85223f0f2837acbf89ab020a
1208:publish	Build and optionally push image	2026-03-29T20:56:20.1863260Z #13 resolve docker.io/library/debian:bookworm-slim@sha256:f06537653ac770703bc45b4b113475bd402f451e85223f0f2837acbf89ab020a done
1211:publish	Build and optionally push image	2026-03-29T20:56:20.1865489Z #14 [go-toolchain 1/1] FROM docker.io/library/golang:1.26.1-bookworm@sha256:8e8aa801e8417ef0b5c42b504dd34db3db911bb73dba933bd8bde75ed815fdbb
1212:publish	Build and optionally push image	2026-03-29T20:56:20.1866675Z #14 resolve docker.io/library/golang:1.26.1-bookworm@sha256:8e8aa801e8417ef0b5c42b504dd34db3db911bb73dba933bd8bde75ed815fdbb done
1213:publish	Build and optionally push image	2026-03-29T20:56:20.3940471Z #14 sha256:4f4fb700ef54461cfa02571ae0db9a0dc1e0cdb5577484a6d75e68dc38e8acc1 32B / 32B 0.0s done
1214:publish	Build and optionally push image	2026-03-29T20:56:20.4946307Z #14 sha256:5eba8db39001fdcf35b6ddfb3581804c75b744045071857f53d2112cd88c7ccd 126B / 126B 0.0s done
1215:publish	Build and optionally push image	2026-03-29T20:56:20.5949301Z #14 sha256:6fbff1d4eb7eece408734c05c8c63a49bb181871bc1280cff3f0e28d25a4ea28 5.24MB / 67.22MB 0.2s
1216:publish	Build and optionally push image	2026-03-29T20:56:20.5953339Z #14 sha256:26fa3468d221545a43d2151f3977695a31857f9342ba842627d03c9fa1b2ae02 24.04MB / 24.04MB 0.2s done
1217:publish	Build and optionally push image	2026-03-29T20:56:20.5957929Z #14 sha256:6cf051f1897bf7109af670b243c7791c62723fc1ebbfa516af2522da6c8c99a9 12.58MB / 64.40MB 0.2s
1220:publish	Build and optionally push image	2026-03-29T20:56:20.7079751Z #15 [builder 1/8] FROM docker.io/library/node:22-bookworm-slim@sha256:80fdb3f57c815e1b638d221f30a826823467c4a56c8f6a8d7aa091cd9b1675ea
1221:publish	Build and optionally push image	2026-03-29T20:56:20.7085554Z #15 resolve docker.io/library/node:22-bookworm-slim@sha256:80fdb3f57c815e1b638d221f30a826823467c4a56c8f6a8d7aa091cd9b1675ea done
1222:publish	Build and optionally push image	2026-03-29T20:56:20.7088436Z #15 sha256:71ff01535b69cedc0a8573f143aa48be03c4d32a5070b443596441eef19fbe6d 447B / 447B 0.1s done
1223:publish	Build and optionally push image	2026-03-29T20:56:20.7092448Z #15 sha256:93f73fef6895aa5cfc0d4c21d29ab9f1a469fe36be478b68965c9a219cbcad96 1.71MB / 1.71MB 0.1s done
1224:publish	Build and optionally push image	2026-03-29T20:56:20.7098131Z #15 sha256:7723618b139f747dbb585f9a357b6f4bad37e18969badd36995d7295695d11dd 3.31kB / 3.31kB 0.1s done
1225:publish	Build and optionally push image	2026-03-29T20:56:20.7102623Z #15 sha256:eb2c6bc01a10394071f6bf5c4b1f13f2fc01bf5e67699ebd9f6cad7c6614e316 49.84MB / 49.84MB 0.5s done
1228:publish	Build and optionally push image	2026-03-29T20:56:20.7109393Z #14 [go-toolchain 1/1] FROM docker.io/library/golang:1.26.1-bookworm@sha256:8e8aa801e8417ef0b5c42b504dd34db3db911bb73dba933bd8bde75ed815fdbb
1229:publish	Build and optionally push image	2026-03-29T20:56:20.7115357Z #14 sha256:6fbff1d4eb7eece408734c05c8c63a49bb181871bc1280cff3f0e28d25a4ea28 25.17MB / 67.22MB 0.3s
1230:publish	Build and optionally push image	2026-03-29T20:56:20.7119572Z #14 sha256:6cf051f1897bf7109af670b243c7791c62723fc1ebbfa516af2522da6c8c99a9 37.75MB / 64.40MB 0.3s
1231:publish	Build and optionally push image	2026-03-29T20:56:20.8118735Z #14 sha256:6fbff1d4eb7eece408734c05c8c63a49bb181871bc1280cff3f0e28d25a4ea28 61.87MB / 67.22MB 0.5s
1232:publish	Build and optionally push image	2026-03-29T20:56:20.8120169Z #14 sha256:9d2f29087bcd6d99efd909a99095549425cd63e27c71b3bf37f108c6b7c370f9 25.17MB / 48.49MB 0.2s
1233:publish	Build and optionally push image	2026-03-29T20:56:20.9791065Z #14 sha256:6fbff1d4eb7eece408734c05c8c63a49bb181871bc1280cff3f0e28d25a4ea28 67.22MB / 67.22MB 0.5s done
1234:publish	Build and optionally push image	2026-03-29T20:56:20.9794184Z #14 sha256:6cf051f1897bf7109af670b243c7791c62723fc1ebbfa516af2522da6c8c99a9 64.40MB / 64.40MB 0.5s done
1235:publish	Build and optionally push image	2026-03-29T20:56:20.9797047Z #14 sha256:9d2f29087bcd6d99efd909a99095549425cd63e27c71b3bf37f108c6b7c370f9 48.49MB / 48.49MB 0.4s done
1236:publish	Build and optionally push image	2026-03-29T20:56:20.9801845Z #14 sha256:b9f83c2f7b0b1b208471e45488b49766ed4316c4776bc2dba21d26d0e3467742 23.07MB / 92.45MB 0.2s
1237:publish	Build and optionally push image	2026-03-29T20:56:21.0976013Z #14 sha256:b9f83c2f7b0b1b208471e45488b49766ed4316c4776bc2dba21d26d0e3467742 48.23MB / 92.45MB 0.3s
1238:publish	Build and optionally push image	2026-03-29T20:56:21.0980528Z #14 extracting sha256:9d2f29087bcd6d99efd909a99095549425cd63e27c71b3bf37f108c6b7c370f9
1239:publish	Build and optionally push image	2026-03-29T20:56:21.2533710Z #14 sha256:b9f83c2f7b0b1b208471e45488b49766ed4316c4776bc2dba21d26d0e3467742 92.45MB / 92.45MB 0.6s done
1246:publish	Build and optionally push image	2026-03-29T20:56:22.7796604Z #13 [runtime 1/4] FROM docker.io/library/debian:bookworm-slim@sha256:f06537653ac770703bc45b4b113475bd402f451e85223f0f2837acbf89ab020a
1247:publish	Build and optionally push image	2026-03-29T20:56:22.7797693Z #13 sha256:6db0909c4473287ed4d1f950d26b8bc5b7b4206d365a0e7740cb89e46979153e 28.24MB / 28.24MB 0.2s done
1248:publish	Build and optionally push image	2026-03-29T20:56:22.7799249Z #13 extracting sha256:6db0909c4473287ed4d1f950d26b8bc5b7b4206d365a0e7740cb89e46979153e 2.4s done
1251:publish	Build and optionally push image	2026-03-29T20:56:22.7802935Z #14 [go-toolchain 1/1] FROM docker.io/library/golang:1.26.1-bookworm@sha256:8e8aa801e8417ef0b5c42b504dd34db3db911bb73dba933bd8bde75ed815fdbb
1252:publish	Build and optionally push image	2026-03-29T20:56:23.5492526Z #14 extracting sha256:9d2f29087bcd6d99efd909a99095549425cd63e27c71b3bf37f108c6b7c370f9 2.6s done
1266:publish	Build and optionally push image	2026-03-29T20:56:24.4055757Z #15 [builder 1/8] FROM docker.io/library/node:22-bookworm-slim@sha256:80fdb3f57c815e1b638d221f30a826823467c4a56c8f6a8d7aa091cd9b1675ea
1267:publish	Build and optionally push image	2026-03-29T20:56:24.4057003Z #15 extracting sha256:7723618b139f747dbb585f9a357b6f4bad37e18969badd36995d7295695d11dd done
1268:publish	Build and optionally push image	2026-03-29T20:56:24.4058104Z #15 extracting sha256:eb2c6bc01a10394071f6bf5c4b1f13f2fc01bf5e67699ebd9f6cad7c6614e316 1.6s done
1271:publish	Build and optionally push image	2026-03-29T20:56:24.5568042Z #15 [builder 1/8] FROM docker.io/library/node:22-bookworm-slim@sha256:80fdb3f57c815e1b638d221f30a826823467c4a56c8f6a8d7aa091cd9b1675ea
1272:publish	Build and optionally push image	2026-03-29T20:56:24.5570403Z #15 extracting sha256:93f73fef6895aa5cfc0d4c21d29ab9f1a469fe36be478b68965c9a219cbcad96 0.1s done
1273:publish	Build and optionally push image	2026-03-29T20:56:24.5571195Z #15 extracting sha256:71ff01535b69cedc0a8573f143aa48be03c4d32a5070b443596441eef19fbe6d done
1541:publish	Build and optionally push image	2026-03-29T20:56:32.3991241Z #14 [go-toolchain 1/1] FROM docker.io/library/golang:1.26.1-bookworm@sha256:8e8aa801e8417ef0b5c42b504dd34db3db911bb73dba933bd8bde75ed815fdbb
1542:publish	Build and optionally push image	2026-03-29T20:56:32.3992852Z #14 extracting sha256:26fa3468d221545a43d2151f3977695a31857f9342ba842627d03c9fa1b2ae02 0.6s done
1543:publish	Build and optionally push image	2026-03-29T20:56:32.3994609Z #14 extracting sha256:6cf051f1897bf7109af670b243c7791c62723fc1ebbfa516af2522da6c8c99a9 2.0s done
1544:publish	Build and optionally push image	2026-03-29T20:56:32.3995939Z #14 extracting sha256:b9f83c2f7b0b1b208471e45488b49766ed4316c4776bc2dba21d26d0e3467742 2.5s done
1545:publish	Build and optionally push image	2026-03-29T20:56:32.3997153Z #14 extracting sha256:6fbff1d4eb7eece408734c05c8c63a49bb181871bc1280cff3f0e28d25a4ea28
1618:publish	Build and optionally push image	2026-03-29T20:56:33.6705657Z #14 [go-toolchain 1/1] FROM docker.io/library/golang:1.26.1-bookworm@sha256:8e8aa801e8417ef0b5c42b504dd34db3db911bb73dba933bd8bde75ed815fdbb
1619:publish	Build and optionally push image	2026-03-29T20:56:33.6707319Z #14 extracting sha256:6fbff1d4eb7eece408734c05c8c63a49bb181871bc1280cff3f0e28d25a4ea28 5.0s done
1620:publish	Build and optionally push image	2026-03-29T20:56:33.6708377Z #14 extracting sha256:5eba8db39001fdcf35b6ddfb3581804c75b744045071857f53d2112cd88c7ccd done
1621:publish	Build and optionally push image	2026-03-29T20:56:33.6709410Z #14 extracting sha256:4f4fb700ef54461cfa02571ae0db9a0dc1e0cdb5577484a6d75e68dc38e8acc1 done
2087:publish	Build and optionally push image	2026-03-29T20:58:40.2911696Z #27 exporting manifest sha256:0f6fd7ea566ea07ad63ab2c574d4c38af0f39ffe6de97980f02e2aeb0124917d done
2088:publish	Build and optionally push image	2026-03-29T20:58:40.2913340Z #27 exporting config sha256:3acf1169ec5785a55954b82d78ed9e8e78c279bb491ca634b5434885b8244e4f done
2089:publish	Build and optionally push image	2026-03-29T20:58:40.2914517Z #27 exporting attestation manifest sha256:470b03121468358530b421843f4aa3dcf7073327b986a5273a2873013bdf7c16 done
2090:publish	Build and optionally push image	2026-03-29T20:58:40.2915360Z #27 exporting manifest list sha256:751929d27806403965bc7998ed1e4dfec168b1ee81723535dd695b04b8e8fbf2 done
2100:publish	Build and optionally push image	2026-03-29T20:59:25.4074708Z #29 writing layer sha256:25b21eb8dcd1c0ad2976f5a40e3e0c768525ab932c7907885fe3991b11fadd82
2101:publish	Build and optionally push image	2026-03-29T20:59:48.2963493Z #29 writing layer sha256:25b21eb8dcd1c0ad2976f5a40e3e0c768525ab932c7907885fe3991b11fadd82 23.0s done
2102:publish	Build and optionally push image	2026-03-29T20:59:48.4390030Z #29 writing layer sha256:2dc82dc11c1bd383af74a6c321777af542c8fe3ce0b34ce0406410d787f151a6 0.1s done
2103:publish	Build and optionally push image	2026-03-29T20:59:48.5763670Z #29 writing layer sha256:4f4fb700ef54461cfa02571ae0db9a0dc1e0cdb5577484a6d75e68dc38e8acc1 0.1s done
2104:publish	Build and optionally push image	2026-03-29T20:59:48.7400809Z #29 writing layer sha256:506f7557d6ecd850ba78b64a4a475cafd7cd77b312f9d4ee1c995dac8dd8673a
2105:publish	Build and optionally push image	2026-03-29T20:59:49.1219378Z #29 writing layer sha256:506f7557d6ecd850ba78b64a4a475cafd7cd77b312f9d4ee1c995dac8dd8673a 0.5s done
2106:publish	Build and optionally push image	2026-03-29T20:59:49.2853829Z #29 writing layer sha256:641f55fab84c4541ceb015e1bdc05143c11cb3d76ff0619ffc3614ddf2c0ec12
2107:publish	Build and optionally push image	2026-03-29T20:59:50.3975180Z #29 writing layer sha256:641f55fab84c4541ceb015e1bdc05143c11cb3d76ff0619ffc3614ddf2c0ec12 1.3s done
2108:publish	Build and optionally push image	2026-03-29T20:59:50.5610232Z #29 writing layer sha256:6db0909c4473287ed4d1f950d26b8bc5b7b4206d365a0e7740cb89e46979153e
2109:publish	Build and optionally push image	2026-03-29T20:59:51.4943131Z #29 writing layer sha256:6db0909c4473287ed4d1f950d26b8bc5b7b4206d365a0e7740cb89e46979153e 1.1s done
2110:publish	Build and optionally push image	2026-03-29T20:59:51.6591331Z #29 writing layer sha256:716a981d62fafb5e727e1d7c877b4a4d5d3438183e4fb6a03332473f62d42d28
2111:publish	Build and optionally push image	2026-03-29T20:59:55.0653727Z #29 writing layer sha256:716a981d62fafb5e727e1d7c877b4a4d5d3438183e4fb6a03332473f62d42d28 3.6s done
2112:publish	Build and optionally push image	2026-03-29T20:59:55.2087801Z #29 writing layer sha256:71ff01535b69cedc0a8573f143aa48be03c4d32a5070b443596441eef19fbe6d 0.1s done
2113:publish	Build and optionally push image	2026-03-29T20:59:55.3545289Z #29 writing layer sha256:7723618b139f747dbb585f9a357b6f4bad37e18969badd36995d7295695d11dd 0.1s done
2114:publish	Build and optionally push image	2026-03-29T20:59:55.5175303Z #29 writing layer sha256:81e5748d1d170f663d1b8d588582ab5eee13d29f9de55f12d8f22527ee698edf
2115:publish	Build and optionally push image	2026-03-29T21:00:01.5080110Z #29 writing layer sha256:81e5748d1d170f663d1b8d588582ab5eee13d29f9de55f12d8f22527ee698edf 6.1s done
2116:publish	Build and optionally push image	2026-03-29T21:00:01.6720784Z #29 writing layer sha256:93f73fef6895aa5cfc0d4c21d29ab9f1a469fe36be478b68965c9a219cbcad96
2117:publish	Build and optionally push image	2026-03-29T21:00:01.7526347Z #29 writing layer sha256:93f73fef6895aa5cfc0d4c21d29ab9f1a469fe36be478b68965c9a219cbcad96 0.2s done
2118:publish	Build and optionally push image	2026-03-29T21:00:01.9170874Z #29 writing layer sha256:94372768378a2442d488112c79481db46efe4428134d79aa75615d6a7ee61b53
2119:publish	Build and optionally push image	2026-03-29T21:00:02.0225923Z #29 writing layer sha256:94372768378a2442d488112c79481db46efe4428134d79aa75615d6a7ee61b53 0.3s done
2120:publish	Build and optionally push image	2026-03-29T21:00:02.1872382Z #29 writing layer sha256:e62bcd5de4b984147df97c9f20b696f35b1b9db092d07c0bb669bb8805122e4b
2121:publish	Build and optionally push image	2026-03-29T21:00:02.3599180Z #29 writing layer sha256:e62bcd5de4b984147df97c9f20b696f35b1b9db092d07c0bb669bb8805122e4b 0.3s done
2122:publish	Build and optionally push image	2026-03-29T21:00:02.5275363Z #29 writing layer sha256:eb2c6bc01a10394071f6bf5c4b1f13f2fc01bf5e67699ebd9f6cad7c6614e316
2123:publish	Build and optionally push image	2026-03-29T21:00:03.9440223Z #29 writing layer sha256:eb2c6bc01a10394071f6bf5c4b1f13f2fc01bf5e67699ebd9f6cad7c6614e316 1.6s done
2124:publish	Build and optionally push image	2026-03-29T21:00:04.1073322Z #29 writing layer sha256:f9bb9fcc886d3038995e78a16e5bc74df5d58883494826c6c24e121bb175c3da
