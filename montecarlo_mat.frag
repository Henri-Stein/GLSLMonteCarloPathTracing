layout(location=20) uniform int nb_emissives;
layout(location=21) uniform int NB_BOUNCES;
layout(location=24) uniform float env_sky_emissive;

#define BIAS 0.01f

// param D : vecteur incident
vec3 sky_color(in vec3 D)
{
	return mix (vec3(0.5,0.5,0.9) * 0.7,vec3(1.0,1.0,0.8) * 0.7,max(0.0,D.z)) * env_sky_emissive; // La couleur du faux ciel change selon la valeur de son emissive
}

vec3 random_on_hemisphere()
{
	float u = random_float();
	float v = random_float();

	float phi = 2.f * PI * u;
	float theta = acos(1.f - v); // Permet d'obtenir un échantillonage uniforme

	float x = cos(phi) * sin(theta);
	float y = sin(phi) * sin(theta);
	float z = cos(theta);

	return vec3(x, y, z);
}


vec3 sample_hemisphere(in vec3 D)
{
	// Z est égal à la normale
	vec3 Z = D; // Axe Z de la nouvelle base

	// On prend l'axe avec le plus petit composante dans la normale
	vec3 axis = vec3(0.f, 0.f, 1.f);
	if(Z.x < Z.y && Z.x < Z.z)
		axis = vec3(1.f, 0.f, 0.f);
	else if (Z.y < Z.z)
		axis = vec3(0.f, 1.f, 0.f);

	axis = random_vec3(); // On prend un axe random pour éviter d'obtenir toujours les mêmes artéfacts dans la même direction (avec un random, les artéfacts seront éffacés par la moyenne des images rendues)

	// X et Y de la nouvelle base (Définie le plan perpendiculaire à D)
	vec3 X = normalize(cross(Z, axis));
	vec3 Y = normalize(cross(Z, X));

	vec3 randDir = random_on_hemisphere(); // Calcule d'une direction aléatoire dans un hémisphère
	return normalize((X * randDir.x) + (Y * randDir.y) + (Z * randDir.z)); // Transformation dans la nouvelle base
}


vec3 random_path(in vec3 D, in vec3 O)
{
	vec3 total = vec3(0.f); // La couleur finale du pixel
	vec3 rayLight = vec3(1.f); // La lumière (intensité et couleur) du rayon

    for(int i=0; i<=NB_BOUNCES; ++i)
    {
        traverse_all_bvh(O,D);
        // si on ne touche rien; calcul d'un faux ciel
        if (!hit())
		{
			total += sky_color(D) * rayLight;
			break;
		}

		vec3 N;
		vec3 P;
		intersection_info(N,P);
		vec4 mat = intersection_mat_info(); // On récupère le matériaux
		vec4 color = intersection_color_info(); // On récupère la couleur

		// Rayon diffus
		vec3 diffuseDir = sample_hemisphere(N);
		float isDiffuse = (random_float() > mat.r) ? 1.f : 0.f; // Si matériaux non-brillant, alors éclairage diffus

		// Rayon spéculaire
		vec3 fullSpecDir = reflect(D, N);
		vec3 realSpecDir = normalize(mix(diffuseDir, fullSpecDir, mat.g)); // Plus le matériaux est rugueux, plus le rayon est diffus

		O = P+BIAS*N; // il faut se décaler un peu dans la direction de la normale pour eviter les auto-intersections
		D = normalize(mix(realSpecDir, diffuseDir, isDiffuse));
		total += mat.b * rayLight; // On accumule dans la couleur finale seulement si on a intersecté une surface emissive
		rayLight = mix(rayLight * color.rgb, rayLight, mat.r) * dot(D, N); // On accumule la couleur selon la brillance, et on atténue selon la prochaine direction
    }
    return total; // On retourne la couleur finale du pixel
}

vec3 raytrace(in vec3 Dir, in vec3 Orig)   
{
	// init de la graine du random
	srand();
	// calcul de la lumière captée par un chemin aléatoire
	return random_path(normalize(Dir),Orig);
}

