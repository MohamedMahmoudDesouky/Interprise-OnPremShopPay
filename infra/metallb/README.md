Install MetalLB

kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.15.2/config/manifests/metallb-native.yaml

Apply IP Pool

kubectl apply -f ipaddresspool.yaml

Apply L2Advertisement

kubectl apply -f l2advertisement.yaml
