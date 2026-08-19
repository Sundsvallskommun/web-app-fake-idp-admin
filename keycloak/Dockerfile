FROM quay.io/keycloak/keycloak:latest

COPY entrypoint.sh /opt/keycloak/bin/custom-entrypoint.sh

USER root
RUN chmod +x /opt/keycloak/bin/custom-entrypoint.sh
USER keycloak

ENTRYPOINT ["/opt/keycloak/bin/custom-entrypoint.sh"]
