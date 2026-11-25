CREATE UNIQUE INDEX properties_organization_id_id_key ON properties (organization_id, id);

CREATE TABLE manager_properties (
    organization_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    property_id BIGINT NOT NULL,
    PRIMARY KEY (organization_id, user_id, property_id),
    FOREIGN KEY (organization_id, user_id) REFERENCES organization_members (organization_id, user_id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id, property_id) REFERENCES properties (organization_id, id) ON DELETE CASCADE
);

CREATE TABLE manager_invites (
    token_hash TEXT PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    property_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
    UNIQUE (organization_id, email),
    FOREIGN KEY (organization_id, property_id) REFERENCES properties (organization_id, id) ON DELETE CASCADE
);

ALTER TABLE tenants ADD COLUMN intake_property_id BIGINT;
ALTER TABLE tenants ADD FOREIGN KEY (organization_id, intake_property_id)
    REFERENCES properties (organization_id, id) ON DELETE SET NULL (intake_property_id);
CREATE INDEX tenants_intake_property_idx ON tenants (intake_property_id);

ALTER TABLE spends ADD COLUMN property_id BIGINT;
ALTER TABLE spends ADD FOREIGN KEY (organization_id, property_id)
    REFERENCES properties (organization_id, id) ON DELETE SET NULL (property_id);
CREATE INDEX spends_property_idx ON spends (property_id);
