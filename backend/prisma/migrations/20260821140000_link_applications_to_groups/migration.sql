-- Applications are classified through groups rather than assigned directly to
-- users. Both sides are optional: existing groups and applications remain valid
-- without a mapping.
CREATE TABLE "_ApplicationToGroup" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_ApplicationToGroup_A_fkey" FOREIGN KEY ("A") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ApplicationToGroup_B_fkey" FOREIGN KEY ("B") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "_ApplicationToGroup_AB_unique" ON "_ApplicationToGroup"("A", "B");
CREATE INDEX "_ApplicationToGroup_B_index" ON "_ApplicationToGroup"("B");

-- Existing per-user assignments do not contain enough provenance to infer which
-- group should own an application. Keep the table as the explicitly modelled
-- LegacyApplicationAccess relation instead of guessing mappings or dropping
-- assignments. Runtime projections union these rows with group-derived access,
-- so existing IdP filtering remains unchanged while administrators migrate the
-- assignments deliberately. The table may be removed in a later migration only
-- after an explicit audit proves that it is empty.
