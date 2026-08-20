-- Profissao vira lista fechada.
--
-- ═══ O QUE ESTA MIGRACAO PROTEGE ═══
-- Gente ja preencheu profissao a mao. Converter o que da para reconhecer e
-- facil; o problema e o resto. Apagar o que nao casa seria destruir dado que
-- a pessoa digitou — e ela so descobriria ao abrir o perfil e ver o campo
-- vazio, sem entender por que.
--
-- Entao o texto nao reconhecido nao morre: ele MUDA DE LUGAR. Vai para
-- `especializacao`, que e livre e acabou de ser criada (esta vazia para todo
-- mundo, entao nao ha o que sobrescrever). "Trabalho com obras" deixa de ser
-- uma profissao invalida e vira a descricao do trabalho, que e o que sempre
-- foi. A pessoa escolhe a categoria na proxima vez que editar o perfil.
--
-- A comparacao usa `sem_acento` e casa a palavra INTEIRA, inclusive a forma
-- feminina (cozinheira, professora, vendedora): num pais onde metade da
-- igreja digita no feminino, ignorar isso jogaria metade dos dados fora.

-- 1. O texto que nao vira chave desce para a especializacao, antes de tudo.
UPDATE usuarios
   SET especializacao = profissao
 WHERE profissao IS NOT NULL
   AND btrim(profissao) <> ''
   AND (especializacao IS NULL OR btrim(especializacao) = '')
   AND sem_acento(btrim(profissao)) NOT IN (
     'acougueira',
     'acougueiro',
     'administrador',
     'administradora',
     'advogada',
     'advogado',
     'arquiteta',
     'arquiteto',
     'artesaa',
     'artesao',
     'baba',
     'barbeira',
     'barbeiro',
     'borracheira',
     'borracheiro',
     'cabeleireira',
     'cabeleireiro',
     'confeiteira',
     'confeiteiro',
     'consertos em geral',
     'contador',
     'contadora',
     'corretor de imoveis',
     'corretor de seguros',
     'corretor imoveis',
     'corretor seguros',
     'corretor_imoveis',
     'corretor_seguros',
     'costureira',
     'cozinheira',
     'cozinheiro',
     'cuidador',
     'cuidador de idosos',
     'dentista',
     'desenvolvedor',
     'desenvolvedora',
     'designer',
     'diarista',
     'eletricista',
     'eletronica',
     'encanador',
     'encanadora',
     'enfermeira',
     'enfermeiro',
     'engenheira',
     'engenheiro',
     'esteticista',
     'farmaceutica',
     'farmaceutico',
     'fisioterapeuta',
     'fotografa',
     'fotografo',
     'fretes',
     'fretes e mudancas',
     'funileira',
     'funileiro',
     'gesseira',
     'gesseiro',
     'jardineira',
     'jardineiro',
     'lavagem de veiculos',
     'lavagem veiculos',
     'lavagem_veiculos',
     'manicure',
     'maquiador',
     'maquiadora',
     'marceneira',
     'marceneiro',
     'massagista',
     'mecanica',
     'mecanico',
     'medica',
     'medico',
     'motorista',
     'mototaxista',
     'musica',
     'musico',
     'nutricionista',
     'outra',
     'outro',
     'padeira',
     'padeiro',
     'pedagoga',
     'pedagogo',
     'pedreira',
     'pedreiro',
     'personal',
     'personal trainer',
     'pintor',
     'pintora',
     'piscineira',
     'piscineiro',
     'professor',
     'professor de musica',
     'professor musica',
     'professor particular',
     'professor_musica',
     'professor_particular',
     'professora',
     'psicologa',
     'psicologo',
     'salgadeira',
     'salgadeiro',
     'seguranca',
     'serralheira',
     'serralheiro',
     'social media',
     'social_media',
     'tecnico de informatica',
     'tecnico de som',
     'tecnico informatica',
     'tecnico som',
     'tecnico_informatica',
     'tecnico_som',
     'tradutor',
     'tradutora',
     'vendedor',
     'vendedora',
     'veterinaria',
     'veterinario',
     'videomaker',
     'vidraceira',
     'vidraceiro'
   );

-- 2. Agora converte o que da, e zera o que sobrou.
UPDATE usuarios
   SET profissao = CASE sem_acento(btrim(profissao))
    WHEN 'pedreira' THEN 'pedreiro'
    WHEN 'pedreiro' THEN 'pedreiro'
    WHEN 'pintor' THEN 'pintor'
    WHEN 'pintora' THEN 'pintor'
    WHEN 'eletricista' THEN 'eletricista'
    WHEN 'encanador' THEN 'encanador'
    WHEN 'encanadora' THEN 'encanador'
    WHEN 'marceneira' THEN 'marceneiro'
    WHEN 'marceneiro' THEN 'marceneiro'
    WHEN 'serralheira' THEN 'serralheiro'
    WHEN 'serralheiro' THEN 'serralheiro'
    WHEN 'gesseira' THEN 'gesseiro'
    WHEN 'gesseiro' THEN 'gesseiro'
    WHEN 'vidraceira' THEN 'vidraceiro'
    WHEN 'vidraceiro' THEN 'vidraceiro'
    WHEN 'arquiteta' THEN 'arquiteto'
    WHEN 'arquiteto' THEN 'arquiteto'
    WHEN 'engenheira' THEN 'engenheiro'
    WHEN 'engenheiro' THEN 'engenheiro'
    WHEN 'diarista' THEN 'diarista'
    WHEN 'jardineira' THEN 'jardineiro'
    WHEN 'jardineiro' THEN 'jardineiro'
    WHEN 'costureira' THEN 'costureira'
    WHEN 'cuidador' THEN 'cuidador'
    WHEN 'cuidador de idosos' THEN 'cuidador'
    WHEN 'baba' THEN 'baba'
    WHEN 'piscineira' THEN 'piscineiro'
    WHEN 'piscineiro' THEN 'piscineiro'
    WHEN 'cozinheira' THEN 'cozinheiro'
    WHEN 'cozinheiro' THEN 'cozinheiro'
    WHEN 'confeiteira' THEN 'confeiteiro'
    WHEN 'confeiteiro' THEN 'confeiteiro'
    WHEN 'salgadeira' THEN 'salgadeiro'
    WHEN 'salgadeiro' THEN 'salgadeiro'
    WHEN 'padeira' THEN 'padeiro'
    WHEN 'padeiro' THEN 'padeiro'
    WHEN 'acougueira' THEN 'acougueiro'
    WHEN 'acougueiro' THEN 'acougueiro'
    WHEN 'cabeleireira' THEN 'cabeleireiro'
    WHEN 'cabeleireiro' THEN 'cabeleireiro'
    WHEN 'barbeira' THEN 'barbeiro'
    WHEN 'barbeiro' THEN 'barbeiro'
    WHEN 'manicure' THEN 'manicure'
    WHEN 'esteticista' THEN 'esteticista'
    WHEN 'maquiador' THEN 'maquiador'
    WHEN 'maquiadora' THEN 'maquiador'
    WHEN 'massagista' THEN 'massagista'
    WHEN 'personal' THEN 'personal'
    WHEN 'personal trainer' THEN 'personal'
    WHEN 'medica' THEN 'medico'
    WHEN 'medico' THEN 'medico'
    WHEN 'enfermeira' THEN 'enfermeiro'
    WHEN 'enfermeiro' THEN 'enfermeiro'
    WHEN 'dentista' THEN 'dentista'
    WHEN 'fisioterapeuta' THEN 'fisioterapeuta'
    WHEN 'psicologa' THEN 'psicologo'
    WHEN 'psicologo' THEN 'psicologo'
    WHEN 'nutricionista' THEN 'nutricionista'
    WHEN 'farmaceutica' THEN 'farmaceutico'
    WHEN 'farmaceutico' THEN 'farmaceutico'
    WHEN 'veterinaria' THEN 'veterinario'
    WHEN 'veterinario' THEN 'veterinario'
    WHEN 'professor' THEN 'professor'
    WHEN 'professora' THEN 'professor'
    WHEN 'pedagoga' THEN 'pedagogo'
    WHEN 'pedagogo' THEN 'pedagogo'
    WHEN 'professor particular' THEN 'professor_particular'
    WHEN 'professor_particular' THEN 'professor_particular'
    WHEN 'professor de musica' THEN 'professor_musica'
    WHEN 'professor musica' THEN 'professor_musica'
    WHEN 'professor_musica' THEN 'professor_musica'
    WHEN 'tradutor' THEN 'tradutor'
    WHEN 'tradutora' THEN 'tradutor'
    WHEN 'motorista' THEN 'motorista'
    WHEN 'mototaxista' THEN 'mototaxista'
    WHEN 'fretes' THEN 'fretes'
    WHEN 'fretes e mudancas' THEN 'fretes'
    WHEN 'mecanica' THEN 'mecanico'
    WHEN 'mecanico' THEN 'mecanico'
    WHEN 'funileira' THEN 'funileiro'
    WHEN 'funileiro' THEN 'funileiro'
    WHEN 'borracheira' THEN 'borracheiro'
    WHEN 'borracheiro' THEN 'borracheiro'
    WHEN 'lavagem de veiculos' THEN 'lavagem_veiculos'
    WHEN 'lavagem veiculos' THEN 'lavagem_veiculos'
    WHEN 'lavagem_veiculos' THEN 'lavagem_veiculos'
    WHEN 'desenvolvedor' THEN 'desenvolvedor'
    WHEN 'desenvolvedora' THEN 'desenvolvedor'
    WHEN 'tecnico de informatica' THEN 'tecnico_informatica'
    WHEN 'tecnico informatica' THEN 'tecnico_informatica'
    WHEN 'tecnico_informatica' THEN 'tecnico_informatica'
    WHEN 'designer' THEN 'designer'
    WHEN 'social media' THEN 'social_media'
    WHEN 'social_media' THEN 'social_media'
    WHEN 'fotografa' THEN 'fotografo'
    WHEN 'fotografo' THEN 'fotografo'
    WHEN 'videomaker' THEN 'videomaker'
    WHEN 'tecnico de som' THEN 'tecnico_som'
    WHEN 'tecnico som' THEN 'tecnico_som'
    WHEN 'tecnico_som' THEN 'tecnico_som'
    WHEN 'contador' THEN 'contador'
    WHEN 'contadora' THEN 'contador'
    WHEN 'advogada' THEN 'advogado'
    WHEN 'advogado' THEN 'advogado'
    WHEN 'corretor de imoveis' THEN 'corretor_imoveis'
    WHEN 'corretor imoveis' THEN 'corretor_imoveis'
    WHEN 'corretor_imoveis' THEN 'corretor_imoveis'
    WHEN 'corretor de seguros' THEN 'corretor_seguros'
    WHEN 'corretor seguros' THEN 'corretor_seguros'
    WHEN 'corretor_seguros' THEN 'corretor_seguros'
    WHEN 'vendedor' THEN 'vendedor'
    WHEN 'vendedora' THEN 'vendedor'
    WHEN 'administrador' THEN 'administrador'
    WHEN 'administradora' THEN 'administrador'
    WHEN 'seguranca' THEN 'seguranca'
    WHEN 'artesaa' THEN 'artesao'
    WHEN 'artesao' THEN 'artesao'
    WHEN 'musica' THEN 'musico'
    WHEN 'musico' THEN 'musico'
    WHEN 'consertos em geral' THEN 'eletronica'
    WHEN 'eletronica' THEN 'eletronica'
    WHEN 'outra' THEN 'outro'
    WHEN 'outro' THEN 'outro'
    ELSE NULL
  END
 WHERE profissao IS NOT NULL;
