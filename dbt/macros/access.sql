{# Ordinal ease of access, 6 = easiest. Home rows have no rank. #}
{% macro ease_rank(category) -%}
    case {{ category }}
        when 'visa_free' then 6
        when 'visa_on_arrival' then 5
        when 'eta' then 4
        when 'e_visa' then 3
        when 'visa_required' then 2
        when 'no_admission' then 1
    end
{%- endmacro %}

{# Coarser tiers used for reciprocity: 4 = no advance application (visa-free or
   on arrival), 3 = ETA, 2 = e-visa, 1 = visa required or no admission. #}
{% macro access_tier(category) -%}
    case
        when {{ category }} in ('visa_free', 'visa_on_arrival') then 4
        when {{ category }} = 'eta' then 3
        when {{ category }} = 'e_visa' then 2
        when {{ category }} in ('visa_required', 'no_admission') then 1
    end
{%- endmacro %}
