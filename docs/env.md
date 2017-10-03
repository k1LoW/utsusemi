# utsusemi Environment / config.yml

|  | Environment | config.yml key | default |
| --- | --- | --- | --- |
| Service name | `UTSUSEMI_SERVICE_NAME` | `serviceName` | utsusemi |
| AWS deploy region | `UTSUSEMI_REGION` | `region` | ap-northeast-1 |
| Crawl target host | `UTSUSEMI_TARGET_HOST` | `targetHost` |  |
| Web site hosting S3 bucket name | `UTSUSEMI_BUCKET_NAME` | `bucketName` |  |
| Crawl worker process | `UTSUSEMI_WORKER_PROCESS` | `workerProcess` | 2 |
| Delay time when start worker (ms) | `UTSUSEMI_WORKER_DELAY` | `workerDelay` | 100 |
| Crawl job threads per worker | `UTSUSEMI_THREADS_PER_WORKER` | `threadsPerWorker` | 1 |
| Change http://example.com/path/to -> http://example.com/path/to/ | `UTSUSEMI_FORCE_TRAILING_SLASH` | `forceTrailingSlash` | 1 |
| Create link with Query String | `UTSUSEMI_WITH_QUERY_STRING` | `withQueryString` | 0 |
| Use API Key when request utsusemi API | `UTSUSEMI_USE_API_KEY` | `useApiKey` | 0 |
| Crawler User Agent | `UTSUSEMI_CRAWLER_USER_AGENT` | `crawlerUserAgent` | `ustusemi/{version}` |
