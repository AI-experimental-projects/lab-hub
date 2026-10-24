#!/usr/bin/env bash
# Host firewall for the homelab.
# Nothing from the LAN gets in. Public traffic doesn't need open ports
# (Cloudflare Tunnel connects outbound). Only allowed:
#   - k3s pod (10.42/16) and service (10.43/16) networks, so the cluster keeps working
#   - the Tailscale interface (your devices on the tailnet)
# Roll back with: sudo ufw disable
set -euo pipefail

sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw default deny routed

# k3s: pods and services talk to the node (API, DNS, kubelet)
sudo ufw allow from 10.42.0.0/16 comment 'k3s pods'
sudo ufw allow from 10.43.0.0/16 comment 'k3s services'

# k3s: forwarding for pod traffic (cloudflared -> Cloudflare, pod <-> pod)
sudo ufw route allow from 10.42.0.0/16 comment 'k3s pod egress'
sudo ufw route allow to 10.42.0.0/16 comment 'k3s pod ingress'

# Tailscale devices
sudo ufw allow in on tailscale0 comment 'tailnet'

sudo ufw --force enable
sudo ufw status verbose
