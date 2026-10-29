FROM php:8.2-fpm

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    git curl libpng-dev libonig-dev libxml2-dev zip unzip

# Instalar extensiones de PHP para MySQL
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd

COPY docker/php-uploads.ini /usr/local/etc/php/conf.d/uploads.ini

# Instalar Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www