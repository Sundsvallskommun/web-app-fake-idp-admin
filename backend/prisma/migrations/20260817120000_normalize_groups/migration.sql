-- CreateTable
CREATE TABLE "Group" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT ''
);

-- CreateTable
CREATE TABLE "_GroupToUser" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_GroupToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_GroupToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Group_name_key" ON "Group"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_GroupToUser_AB_unique" ON "_GroupToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_GroupToUser_B_index" ON "_GroupToUser"("B");

-- Build the group catalogue from the legacy comma-separated Attribute values.
WITH RECURSIVE "split"("userId", "groupName", "remaining") AS (
    SELECT "userId", '', "value" || ','
    FROM "Attribute"
    WHERE "key" = 'groups'
    UNION ALL
    SELECT
        "userId",
        trim(substr("remaining", 1, instr("remaining", ',') - 1)),
        substr("remaining", instr("remaining", ',') + 1)
    FROM "split"
    WHERE "remaining" <> ''
)
INSERT OR IGNORE INTO "Group" ("name", "description")
SELECT DISTINCT "groupName", ''
FROM "split"
WHERE "groupName" <> '';

-- Preserve every existing user membership before removing the legacy claim rows.
WITH RECURSIVE "split"("userId", "groupName", "remaining") AS (
    SELECT "userId", '', "value" || ','
    FROM "Attribute"
    WHERE "key" = 'groups'
    UNION ALL
    SELECT
        "userId",
        trim(substr("remaining", 1, instr("remaining", ',') - 1)),
        substr("remaining", instr("remaining", ',') + 1)
    FROM "split"
    WHERE "remaining" <> ''
)
INSERT OR IGNORE INTO "_GroupToUser" ("A", "B")
SELECT "Group"."id", "split"."userId"
FROM "split"
JOIN "Group" ON "Group"."name" = "split"."groupName"
WHERE "split"."groupName" <> '';

DELETE FROM "Attribute" WHERE "key" = 'groups';
