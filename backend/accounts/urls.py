from django.urls import path
from . import views

urlpatterns = [
    path("register/", views.register),
    path("login/", views.login),
    path("me/", views.me),
]

store_urlpatterns = [
    path("init/", views.store_init, name="store_init"),
    path("sync/", views.store_sync, name="store_sync"),
]
