FROM grafana/grafana

VOLUME ["/var/lib/grafana"]

ENV GF_SERVER_HTTP_PORT=9091 \
    GF_AUTH_DISABLE_LOGIN_FORM=true \
    GF_AUTH_ANONYMOUS_ENABLED=true \
    GF_AUTH_ANONYMOUS_ORG_ROLE=Viewer \
    GF_LOG_LEVEL=warn \
    GF_LOG_FILTERS=alerting.notifier=warn rendering=error

COPY provisioning /etc/grafana/provisioning