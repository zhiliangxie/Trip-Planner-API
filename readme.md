# Trip Planner API

The **Trip Planner API** is a backend service built with **Node.js (Fastify)** that allows users to **search and manage trips** between airports.  
It integrates with a 3rd-party trips API to provide travel data and supports sorting by **fastest** or **cheapest** options.
As the API can have hight load of traffic, I have introduced Redis to cache the data.


## Features

- **Search trips** by origin and destination, and sort by duration (`fastest`) or cost (`cheapest`)
- **Save trips** into a PostgreSQL database  
- **List saved trips** with pagination support  
- **Delete saved trips** by ID  
- **Automated testing** using Jest  

## Additional considerations

- **Retry logic** as it interacts with external API a retry logic is included in case the request fails
- **Redis** included redis for caching the queries from the app to the third party application and interactions with PostgreSQL
- **Swagger / OpenAPI documentation** included api documantation, available at http://localhost:3000/docs
- **Dockerized** for easy local setup

## Tech Stack

- Runtime: Node.js (TypeScript)
- Framework: Fastify
- ORM: Prisma
- Database: PostgreSQL & Redis
- Documentation: Swagger / OpenAPI 3
- Testing: Jest
- Containerization: Docker

## Requirements

- **Node.js** 
- **npm**
- **Docker** & **Docker Compose**


## Installation process

### Clone the project

`git clone https://github.com/zhiliangxie/Trip-Planner-API.git`

`cd trip-planner-api`

### Set up environment variables

`mv .env.example .env`

Update TRIPS_API_KEY with the corresponding key

### Build and start the application

`docker-compose up --build`

This will:

- Start PostgreSQL
- Run database migrations
- Launch the API
- Run the tests

API available at: http://localhost:3000

Swagger Docs at: http://localhost:3000/docs

### Run Tests
`docker compose run --rm test`
### Remove the project
`docker-compose down -v`