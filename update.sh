#!/usr/bin/bash

echo $*
sudo systemctl restart nginx;
sudo certbot --nginx -d $*
