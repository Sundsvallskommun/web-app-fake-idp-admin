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

-- Preserve only direct assignments that can be represented without granting a
-- previously unassigned user access. A group is linked to an application when
-- every current member of that group was directly assigned to the application.
-- Direct assignments without such a group cannot be converted safely and are
-- intentionally left behind when the obsolete join table is removed.
INSERT OR IGNORE INTO "_ApplicationToGroup" ("A", "B")
SELECT DISTINCT "applicationUser"."A", "groupUser"."A"
FROM "_ApplicationToUser" AS "applicationUser"
JOIN "_GroupToUser" AS "groupUser" ON "groupUser"."B" = "applicationUser"."B"
WHERE NOT EXISTS (
    SELECT 1
    FROM "_GroupToUser" AS "otherGroupUser"
    WHERE "otherGroupUser"."A" = "groupUser"."A"
      AND NOT EXISTS (
          SELECT 1
          FROM "_ApplicationToUser" AS "otherApplicationUser"
          WHERE "otherApplicationUser"."A" = "applicationUser"."A"
            AND "otherApplicationUser"."B" = "otherGroupUser"."B"
      )
);

DROP TABLE "_ApplicationToUser";
