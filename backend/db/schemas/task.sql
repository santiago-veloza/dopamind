-- task_db: tareas, catálogo predefinido y outbox

CREATE TABLE tasks (
  id                    SERIAL PRIMARY KEY,
  user_id               INTEGER NOT NULL,
  title                 TEXT NOT NULL,
  description           TEXT,
  priority              TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  category              TEXT NOT NULL DEFAULT 'general',
  completed             BOOLEAN NOT NULL DEFAULT false,
  photo_verified        BOOLEAN NOT NULL DEFAULT false,
  photo_path            TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at          TIMESTAMPTZ,
  due_date              TIMESTAMPTZ,
  scheduled_hour        INTEGER CHECK (scheduled_hour BETWEEN 0 AND 23),
  scheduled_minute      INTEGER CHECK (scheduled_minute BETWEEN 0 AND 59),
  verification_keywords TEXT NOT NULL DEFAULT ''
);

CREATE INDEX idx_tasks_user_id ON tasks (user_id);
CREATE INDEX idx_tasks_user_completed ON tasks (user_id, completed);

CREATE TABLE predefined_tasks (
  id                    SERIAL PRIMARY KEY,
  title                 TEXT NOT NULL UNIQUE,
  description           TEXT NOT NULL,
  priority              TEXT NOT NULL DEFAULT 'medium',
  category              TEXT NOT NULL DEFAULT 'general',
  icon                  TEXT NOT NULL DEFAULT '📋',
  verification_keywords TEXT NOT NULL DEFAULT ''
);

INSERT INTO predefined_tasks (title, description, priority, category, icon, verification_keywords) VALUES
('Lavar la loza', 'Lavar todos los platos, vasos y cubiertos', 'high', 'hogar', '🍽️', 'plate,dish,dishes,cup,spoon,fork,bowl,plato,vaso,cuchara,tenedor,taza,sarten,olla,kitchen,sink,fregadero,lavabo'),
('Hacer la cama', 'Ordenar las sábanas, almohadas y cobija', 'medium', 'hogar', '🛏️', 'bed,pillow,blanket,sheet,mattress,cama,almohada,sabana,cobija,colcha,bedroom,dormitorio'),
('Sacar la basura', 'Recolectar y sacar la basura del hogar', 'high', 'hogar', '🗑️', 'trash,garbage,bin,bag,waste,basura,bolsa,contenedor,reciclaje'),
('Limpiar el piso', 'Barrer y trapear todas las habitaciones', 'medium', 'hogar', '🧹', 'broom,mop,floor,clean,bucket,escoba,trapeador,piso,balde,fregona'),
('Lavar la ropa', 'Lavar, secar y doblar la ropa', 'high', 'hogar', '👕', 'clothes,shirt,pants,washing,laundry,detergent,ropa,camisa,pantalon,lavadora,detergente,jabon,clothesline,tendedero,secadora'),
('Cocinar', 'Preparar una comida saludable', 'high', 'hogar', '🍳', 'food,cooking,stove,pan,pot,kitchen,comida,cocinar,estufa,sarten,olla,cocina,vegetable,fruit,verdura,fruta,ingredient'),
('Organizar el armario', 'Ordenar y clasificar la ropa del armario', 'low', 'hogar', '👔', 'closet,clothes,hanger,wardrobe,fold,armario,ropa,percha,clóset,doblar'),
('Limpiar el baño', 'Limpiar inodoro, lavabo y ducha', 'high', 'hogar', '🚿', 'bathroom,toilet,sink,shower,clean,soap,baño,inodoro,lavabo,ducha,limpiar,jabon'),
('Hacer ejercicio', 'Realizar 30 minutos de actividad física', 'high', 'salud', '💪', 'exercise,workout,gym,dumbbell,running,yoga,ejercicio,pesa,mancuerna,gimnasio,correr,mat,colchoneta,resistance'),
('Beber agua', 'Tomar al menos 8 vasos de agua al día', 'medium', 'salud', '💧', 'water,glass,bottle,drink,hydration,agua,vaso,botella,beber,hidratacion'),
('Meditar', 'Dedicar 10 minutos a la meditación', 'medium', 'salud', '🧘', 'meditation,peaceful,calm,breathing,mindful,meditacion,paz,calma,respiracion,mindfulness'),
('Dormir 8 horas', 'Acostarse temprano para descansar bien', 'high', 'salud', '😴', 'bed,sleep,pillow,blanket,night,rest,cama,dormir,almohada,cobija,noche,descanso'),
('Leer 30 minutos', 'Leer un libro o artículo interesante', 'medium', 'personal', '📖', 'book,reading,page,novel,library,libro,leer,pagina,novela,biblioteca'),
('Escribir en el diario', 'Registrar pensamientos y emociones del día', 'low', 'personal', '📝', 'diary,journal,writing,pen,notebook,diario,escribir,lapiz,cuaderno,nota'),
('Llamar a un familiar', 'Hablar con alguien cercano', 'medium', 'personal', '📞', 'phone,call,talking,family,telefono,llamar,hablar,familia'),
('Salir a caminar', 'Caminar al menos 20 minutos al aire libre', 'medium', 'personal', '🚶', 'walking,outdoor,street,park,nature,caminar,calle,parque,natura,paseo'),
('Estudiar 1 hora', 'Dedicar tiempo al estudio o capacitación', 'high', 'estudio', '📚', 'study,book,notebook,computer,desk,estudiar,libro,cuaderno,computador,escritorio'),
('Organizar el escritorio', 'Mantener el espacio de trabajo limpio', 'low', 'trabajo', '🖥️', 'desk,office,computer,organize,clean,escritorio,oficina,computador,organizar,limpiar'),
('Revisar correo', 'Responder mensajes importantes pendientes', 'medium', 'trabajo', '📧', 'email,computer,inbox,message,correo,computador,bandeja,mensaje'),
('Sin celular 1 hora', 'No usar el celular por una hora', 'high', 'personal', '📵', 'offline,phone,no screen,celular,pantalla'),
('Caminar sin audífonos', 'Caminar escuchando el ambiente, sin distracciones', 'medium', 'salud', '🌿', 'walking,outdoor,nature,park,street,caminar,natura,parque,calle,aire'),
('Comer sin pantalla', 'Comer sin ver el celular ni la tele', 'high', 'salud', '🍽️', 'food,eating,table,plate,meal,comida,comer,mesa,plato,almuerzo'),
('10 min sin estímulos', 'Estar sentado sin hacer nada, solo respirar', 'high', 'salud', '🪷', 'calm,peaceful,quiet,still,calma,paz,silencio,quiet');

-- Eventos pendientes de publicar en RabbitMQ (patrón outbox)
CREATE TABLE outbox (
  id           BIGSERIAL PRIMARY KEY,
  event_id     TEXT NOT NULL UNIQUE,
  routing_key  TEXT NOT NULL,
  payload      JSONB NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);

CREATE INDEX idx_outbox_pending ON outbox (id) WHERE published_at IS NULL;
