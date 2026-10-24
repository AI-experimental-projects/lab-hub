#!/usr/bin/env bash
# Single-node k3s for the homelab.
# Traefik and ServiceLB are disabled: public traffic arrives through cloudflared
# running inside the cluster, so nothing listens on host ports 80/443.
set -euo pipefail

K3S_CHANNEL="${K3S_CHANNEL:-stable}"

curl -sfL https://get.k3s.io | INSTALL_K3S_CHANNEL="$K3S_CHANNEL" sh -s - server \
  --disable traefik \
  --disable servicelb \
  --write-kubeconfig-mode 600

mkdir -p "$HOME/.kube"
sudo cp /etc/rancher/k3s/k3s.yaml "$HOME/.kube/config"
sudo chown "$(id -u):$(id -g)" "$HOME/.kube/config"
chmod 600 "$HOME/.kube/config"

kubectl wait --for=condition=Ready node --all --timeout=120s
kubectl get nodes -o wide
