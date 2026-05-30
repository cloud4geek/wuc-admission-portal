#!/bin/bash
# Fix PostgreSQL authentication for wuc_admin user

echo "Updating PostgreSQL pg_hba.conf..."
sudo sed -i 's/^local\s*all\s*all\s*peer/local   all             all                                     md5/' /etc/postgresql/*/main/pg_hba.conf
sudo sed -i 's/^host\s*all\s*all\s*127.0.0.1\/32\s*ident/host    all             all             127.0.0.1\/32            md5/' /etc/postgresql/*/main/pg_hba.conf

echo "Restarting PostgreSQL..."
sudo systemctl restart postgresql

echo "Done! Now run: psql -h localhost -U wuc_admin -d wuc_admissions -f database/schema.sql"
