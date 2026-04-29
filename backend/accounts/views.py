from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import User
from .serializers import RegisterSerializer, UserSerializer


@api_view(["POST"])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = serializer.save()
    return Response(
        {"message": "Registrasi berhasil", "user": UserSerializer(user).data},
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
def login(request):
    email = request.data.get("email", "").strip()
    password = request.data.get("password", "")

    if not email or not password:
        return Response({"error": "Email dan password wajib diisi"}, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(request, username=email, password=password)
    if user is None:
        return Response({"error": "Email atau password salah"}, status=status.HTTP_401_UNAUTHORIZED)

    if user.status == "locked":
        return Response({"error": "Akun dikunci. Hubungi admin."}, status=status.HTTP_403_FORBIDDEN)

    return Response({"message": "Login berhasil", "user": UserSerializer(user).data})


@api_view(["GET"])
def me(request):
    email = request.query_params.get("email")
    if not email:
        return Response({"error": "Parameter email diperlukan"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        user = User.objects.get(email=email)
        return Response(UserSerializer(user).data)
    except User.DoesNotExist:
        return Response({"error": "User tidak ditemukan"}, status=status.HTTP_404_NOT_FOUND)
