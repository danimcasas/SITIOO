from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
r=Path(__file__).resolve().parents[1];assets=r/'config/assets'
# Conversion to the native macOS multi-resolution icon container; original PNG is preserved.
Image.open(assets/'sitioo.png').save(assets/'sitioo.icns',format='ICNS')
fontroot=Path('/System/Library/Fonts/Supplemental')
def font(size,bold=False):return ImageFont.truetype(str(fontroot/('Arial Bold.ttf' if bold else 'Arial.ttf')),size)
canvas=Image.new('RGB',(660,430),'#f7f6fc');d=ImageDraw.Draw(canvas)
d.rounded_rectangle((24,22,636,408),radius=22,fill='#ffffff')
d.text((50,45),'Instala SITIOO',font=font(30,True),fill='#292536')
d.text((51,90),'Tu web empieza aquí.',font=font(17),fill='#777182')
d.line((298,224,361,224),fill='#7960df',width=4)
d.line((350,213,361,224,350,235),fill='#7960df',width=4)
d.text((51,335),'1. Arrastra SITIOO a Aplicaciones.',font=font(16,True),fill='#544075')
d.text((51,365),'2. Ábrelo y crea tu primera web.',font=font(16),fill='#777182')
canvas.save(assets/'dmg-background.png')
print('Icono ICNS y fondo del DMG preparados.')
