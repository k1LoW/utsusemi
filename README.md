# utsusemi

utsusemi = "空蝉"

A tool to generate a static website by crawling the original site.

## Using framework

- Serverless Framework :zap:

## How to deploy

### :octocat: STEP 1. Clone

```sh
$ git clone https://github.com/k1LoW/utsusemi.git
$ cd utsusemi
$ npm install
```

### :pencil: STEP 2. Edit config

Copy [`config.example.yml`](config.example.yml) to `config.yml`. And edit.

### :rocket: STEP 3. Deploy to AWS

```sh
$ AWS_PROFILE=XXxxXXX npm run deploy
```

And get endpoints URL and `UtsusemiWebsiteURL`

#### :bomb: Destroy utsusemi

1. Call API `/delete?path=/`
2. Run following command.

```sh
$ AWS_PROFILE=XXxxXXX npm run destroy
```

## Usage

### `/in` Start crawl 

Start crawl target.

```
$ curl https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/v0/in?path=/&depth=3
```

And, access `UtsusemiWebsiteURL`.

### `/cancel` Cancel crawl

### `/delete` Delete object of utsusemi content

## Architecture

![Architecture](architecture.png)
