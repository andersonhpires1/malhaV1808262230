-- Função mais segura para acessar chaves sem gerar erros de coluna faltante usando jsonb e jsonb_populate_record
CREATE OR REPLACE FUNCTION auto_associate_companhia_id()
RETURNS TRIGGER AS $$
DECLARE
   _json jsonb;
   _airline text;
   _airline_code text;
   _found_id uuid;
BEGIN
   _json := to_jsonb(NEW);
   
   -- Verifica de forma totalmente dinâmica se o campo companhia_id existe na tabela e está nulo
   IF _json ? 'companhia_id' AND (_json ->> 'companhia_id') IS NULL THEN
      -- Captura através de jsonb garantindo que não vai quebrar independente da estrutura exata da tabela
      _airline_code := (_json ->> 'airline_code');
      _airline := (_json ->> 'airline');
      _found_id := NULL;

      IF _airline_code IS NOT NULL AND trim(_airline_code) <> '' THEN
         SELECT id INTO _found_id FROM companhias WHERE upper(trim(airline_code)) = upper(trim(_airline_code)) LIMIT 1;
      END IF;
      
      IF _found_id IS NULL AND _airline IS NOT NULL AND trim(_airline) <> '' THEN
         SELECT id INTO _found_id FROM companhias WHERE upper(trim(airline)) = upper(trim(_airline)) LIMIT 1;
      END IF;

      IF _found_id IS NOT NULL THEN
         _json := _json || jsonb_build_object('companhia_id', _found_id);
         NEW := jsonb_populate_record(NEW, _json);
      END IF;
   END IF;
   
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;
