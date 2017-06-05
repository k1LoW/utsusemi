# utsusemi [![Build Status](https://travis-ci.org/k1LoW/utsusemi.svg?branch=master)](https://travis-ci.org/k1LoW/utsusemi)

utsusemi = "[空蝉](http://ffxiclopedia.wikia.com/wiki/Utsusemi)"

A tool to generate a static website by crawling the original site.

## Using framework

- Serverless Framework :zap:

## How to deploy

### :octocat: STEP 1. Clone

```console
$ git clone https://github.com/k1LoW/utsusemi.git
$ cd utsusemi
$ npm install
```

### :pencil: STEP 2. Edit config

Copy [`config.example.yml`](config.example.yml) to `config.yml`. And edit.

### :rocket: STEP 3. Deploy to AWS

```console
$ AWS_PROFILE=XXxxXXX npm run deploy
```

And get endpoints URL and `UtsusemiWebsiteURL`

#### :bomb: Destroy utsusemi

1. Call API `/delete?path=/`
2. Run following command.

```console
$ AWS_PROFILE=XXxxXXX npm run destroy
```

## Usage

### Start crawling `/in?path={startPath}&depth={crawlDepth}`

Start crawling to targetHost.

```console
$ curl https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/v0/in?path=/&depth=3
```

And, access `UtsusemiWebsiteURL`.

### Purge crawling queue `/purge`

Cancel crawling.

```console
$ curl https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/v0/purge
```

### Delete object of utsusemi content `/delete?prefix={objectPrefix}`

Delete S3 object.

```console
$ curl https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/v0/delete?path=/
```

## Architecture

![Architecture](architecture.png)

### Crawling rule

- HTML -> `depth--`
- CSS -> The source request in the CSS does not consume `depth`.
- Other contents -> End ( `depth = 0` )
