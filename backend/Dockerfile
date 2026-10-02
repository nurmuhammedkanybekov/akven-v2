# Builds the backend in one stage and runs it on a slim Java runtime in the next.
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /src
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q -DskipTests package && cp target/*-SNAPSHOT.jar /app.jar

FROM eclipse-temurin:17-jre
RUN useradd --system --create-home akven && mkdir -p /data/media && chown akven /data/media
USER akven
COPY --from=build /app.jar /app.jar
ENV MEDIA_DIR=/data/media
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app.jar"]
