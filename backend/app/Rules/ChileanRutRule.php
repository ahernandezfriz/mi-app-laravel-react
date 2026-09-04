<?php

namespace App\Rules;

use App\Support\ChileanRut;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class ChileanRutRule implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! ChileanRut::isValid(is_string($value) ? $value : null)) {
            $fail('El :attribute no es un RUT chileno valido.');
        }
    }
}
