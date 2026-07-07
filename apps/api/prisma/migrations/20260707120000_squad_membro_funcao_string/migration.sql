-- SquadMembro.funcao: enum "FuncaoSquad" -> TEXT (String) para aceitar todos os Cargos.
-- FuncaoSquad e subconjunto de Cargo; todos os valores ja gravados permanecem validos.
-- A constraint @@unique([squadId, funcao]) e preservada (segue valendo sobre a coluna TEXT).
ALTER TABLE "squad_membro" ALTER COLUMN "funcao" TYPE TEXT USING "funcao"::text;
