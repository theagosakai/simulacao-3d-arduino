from math import cos, sin

from kivy.app import App
from kivy.clock import Clock
from kivy.graphics import Color, Ellipse, Line, Rectangle
from kivy.input.motionevent import MotionEvent
from kivy.properties import NumericProperty
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.label import Label
from kivy.uix.slider import Slider
from kivy.uix.widget import Widget


class ArduinoBoard(Widget):
    rotation = NumericProperty(0)
    zoom = NumericProperty(1)
    led_on = NumericProperty(1)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.touch_positions = {}
        self._last_touch = None
        self.bind(size=self.draw, pos=self.draw,
                  rotation=self.draw, zoom=self.draw, led_on=self.draw)
        Clock.schedule_interval(self.animate_led, 0.08)

    def animate_led(self, _dt):
        self.led_on = 1 - self.led_on if self.led_on else 0

    def on_touch_down(self, touch):
        self._last_touch = (touch.x, touch.y)
        return True

    def on_touch_move(self, touch):
        if self._last_touch is not None:
            dx = touch.x - self._last_touch[0]
            dy = touch.y - self._last_touch[1]
            self.rotation = (self.rotation + dx * 0.35) % 360
            self.zoom = max(0.65, min(1.55, self.zoom + dy * 0.002))
            self._last_touch = (touch.x, touch.y)
        return True

    def on_touch_up(self, touch):
        self._last_touch = None
        return True

    def draw(self, *_args):
        self.canvas.clear()
        cx = self.center_x
        cy = self.center_y - 18
        scale = min(self.width / 420, self.height / 500) * self.zoom
        angle = self.rotation * 0.017453292519943295

        def transform(x, y, depth=0):
            x = x - 170
            y = y - 120
            rx = x * cos(angle) - y * sin(angle)
            ry = x * sin(angle) + y * cos(angle)
            return cx + rx * scale, cy + ry * scale * 0.72 + depth * scale

        with self.canvas:
            Color(0.04, 0.09, 0.09, 1)
            sx, sy = cx - 205 * scale, cy - 170 * scale
            Rectangle(pos=(sx, sy), size=(410 * scale, 340 * scale))

            Color(0.03, 0.38, 0.34, 1)
            Rectangle(pos=transform(0, 0),
                      size=(340 * scale, 240 * scale))

            for px, py in [(22, 22), (318, 22), (318, 218), (22, 218)]:
                Color(0.75, 0.58, 0.25, 1)
                hx, hy = transform(px, py)
                Ellipse(pos=(hx - 5 * scale, hy - 5 * scale),
                        size=(10 * scale, 10 * scale))

            Color(0.69, 0.70, 0.62, 1)
            usb_x, usb_y = transform(8, 102, 5)
            Rectangle(pos=(usb_x, usb_y), size=(45 * scale, 55 * scale))

            Color(0.12, 0.12, 0.12, 1)
            chip_x, chip_y = transform(145, 105, 8)
            Rectangle(pos=(chip_x, chip_y), size=(72 * scale, 72 * scale))

            Color(0.82, 0.82, 0.76, 1)
            crystal_x, crystal_y = transform(102, 88, 8)
            Rectangle(pos=(crystal_x, crystal_y), size=(38 * scale, 18 * scale))

            Color(0.76, 0.45, 0.25, 1)
            for index in range(10):
                x, y = transform(62 + index * 24, 205)
                Line(points=[x, y, x + 8 * scale, y], width=2 * scale)

            led_color = 0.95 if self.led_on else 0.22
            Color(led_color, 0.08, 0.08, 1)
            led_x, led_y = transform(260, 205, 10)
            Ellipse(pos=(led_x, led_y), size=(13 * scale, 13 * scale))

            Color(0.82, 0.82, 0.82, 1)
            power_x, power_y = transform(8, 205, 6)
            Rectangle(pos=(power_x, power_y), size=(48 * scale, 30 * scale))

            Color(0.72, 0.72, 0.68, 1)
            button_x, button_y = transform(270, 155, 8)
            Rectangle(pos=(button_x, button_y), size=(30 * scale, 30 * scale))


class ArduinoKivyApp(App):
    title = "Arduino 3D Lab"

    def build(self):
        root = BoxLayout(orientation="vertical")
        board = ArduinoBoard()
        root.add_widget(board)

        controls = BoxLayout(size_hint_y=None, height=80, padding=12, spacing=12)
        controls.add_widget(Label(text="Rotacao", size_hint_x=None, width=70))
        rotation = Slider(min=-180, max=180, value=0)
        rotation.bind(value=lambda _instance, value: setattr(board, "rotation", (value + 180) % 360))
        controls.add_widget(rotation)
        controls.add_widget(Label(text="Zoom", size_hint_x=None, width=55))
        zoom = Slider(min=0.65, max=1.55, value=1)
        zoom.bind(value=lambda _instance, value: setattr(board, "zoom", value))
        controls.add_widget(zoom)
        root.add_widget(controls)
        return root


if __name__ == "__main__":
    ArduinoKivyApp().run()
