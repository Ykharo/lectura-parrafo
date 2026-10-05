# Genera la lectura en voz alta de un cuento con Gemini (basado en el código de AI Studio).
#
# Requisitos (una sola vez):
#   pip install google-genai
#   y una clave de API de Gemini (AI Studio → "Get API key") en la variable de entorno GEMINI_API_KEY.
#
# Uso (desde la carpeta del proyecto):
#   python herramientas/generar_audio.py midas
#   python herramientas/generar_audio.py astronauta
#   python herramientas/generar_audio.py leon-raton
# Guarda assets/audio/<id>.wav. Después, para los tiempos de cada palabra:
#   node herramientas/sincronizar.js <id> assets/audio/<id>.wav
#
# La clave NUNCA se escribe en este archivo: se lee del entorno.

import mimetypes
import os
import struct
import sys

from google import genai
from google.genai import types

# El texto debe ser idéntico al de js/textos.js (sin las marcas " / ").
TEXTOS = {
    "astronauta": (
        "Lucas sueña con ser astronauta. Todas las noches mira las estrellas con su telescopio "
        "desde la ventana de su habitación. Ya conoce el nombre de varios planetas: Mercurio, Venus, "
        "Marte y Júpiter. Su favorito es Saturno, porque tiene unos anillos espectaculares. Algún día, "
        "Lucas quiere viajar por el espacio y descubrir un planeta nuevo para ponerle el nombre de su perro."
    ),
    "midas": (
        "El rey Midas amaba el oro más que nada en el mundo. Un día, el dios Dioniso le concedió un deseo muy especial. "
        "Midas pidió que todo lo que tocara se convirtiera en oro brillante. Al principio estaba feliz y tocó las flores, "
        "las sillas y las piedras del jardín. Pero cuando quiso comer, el pan y las uvas también se volvieron de oro. "
        "Tenía mucha hambre y mucha sed, y comenzó a llorar. Entonces le rogó a Dioniso que le quitara ese poder. "
        "El dios le dijo que se lavara en el río, y así lo hizo. Desde ese día, Midas prefirió una mesa con comida "
        "antes que un palacio de oro."
    ),
    "leon-raton": (
        "Un león dormía tranquilamente bajo la sombra de un árbol. De pronto, un pequeño ratón pasó corriendo "
        "sobre su cuerpo. El león despertó y lo atrapó con una de sus enormes patas. —¡Por favor, déjame ir! "
        "—suplicó el ratón—. Algún día podría ayudarte. El león se rio, pero decidió dejarlo libre. "
        "Días después, el león quedó atrapado en una red. Intentó escapar, pero no pudo. Al escuchar sus rugidos, "
        "el ratón llegó rápidamente y comenzó a roer las cuerdas. Poco después, el león quedó libre. "
        "Nadie es tan pequeño que no pueda ayudar a los demás."
    ),
}
VOZ = "Sami"
MODELO = "gemini-3.8-flash-tts"
CARPETA = os.path.join(os.path.dirname(__file__), "..", "assets", "audio")


def generar(id_texto):
    if id_texto not in TEXTOS:
        sys.exit(f"No existe el texto '{id_texto}'. Opciones: {', '.join(TEXTOS)}")
    clave = os.environ.get("GEMINI_API_KEY")
    if not clave:
        sys.exit("Falta la variable de entorno GEMINI_API_KEY.")

    cliente = genai.Client(api_key=clave)
    contenido = [types.Content(role="user", parts=[types.Part.from_text(text=f"## Transcript:\n{TEXTOS[id_texto]}")])]
    config = types.GenerateContentConfig(
        temperature=1,
        response_modalities=["audio"],
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=VOZ))
        ),
    )

    audio = bytearray()
    tipo = ""
    for parte in cliente.models.generate_content_stream(model=MODELO, contents=contenido, config=config):
        if parte.parts and parte.parts[0].inline_data and parte.parts[0].inline_data.data:
            audio.extend(parte.parts[0].inline_data.data)
            tipo = parte.parts[0].inline_data.mime_type

    if not audio:
        sys.exit("No se recibió audio.")

    extension = mimetypes.guess_extension(tipo)
    datos = bytes(audio)
    if extension is None:  # audio crudo (PCM): se le agrega cabecera WAV
        extension = ".wav"
        datos = a_wav(datos, tipo)

    os.makedirs(CARPETA, exist_ok=True)
    ruta = os.path.abspath(os.path.join(CARPETA, id_texto + extension))
    with open(ruta, "wb") as f:
        f.write(datos)
    print(f"Audio guardado en: {ruta}")


def a_wav(datos: bytes, tipo: str) -> bytes:
    bits, frecuencia = 16, 24000
    for p in tipo.split(";"):
        p = p.strip()
        if p.lower().startswith("rate="):
            try:
                frecuencia = int(p.split("=", 1)[1])
            except ValueError:
                pass
        elif p.startswith("audio/L"):
            try:
                bits = int(p.split("L", 1)[1])
            except ValueError:
                pass
    bloque = bits // 8
    cabecera = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF", 36 + len(datos), b"WAVE", b"fmt ", 16, 1, 1,
        frecuencia, frecuencia * bloque, bloque, bits, b"data", len(datos),
    )
    return cabecera + datos


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("Uso: python herramientas/generar_audio.py <id>   (por ejemplo: midas)")
    generar(sys.argv[1])
