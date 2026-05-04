from django.contrib import admin
from django.urls import path, include
from accounts.urls import store_urlpatterns

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/store/', include((store_urlpatterns, 'store'))),
]
