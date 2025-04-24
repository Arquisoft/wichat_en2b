FROM prom/prometheus

VOLUME ["/prometheus"]
WORKDIR /prometheus

COPY prometheus.yml /etc/prometheus/prometheus.yml

CMD ["--config.file=/etc/prometheus/prometheus.yml", "--storage.tsdb.path=/prometheus", "--log.level=warn"]