helm upgrade \
--install kong kong/kong \
-n shoppay-gateway \
--create-namespace \
-f values-base.yaml \
-f values-dev.yaml
